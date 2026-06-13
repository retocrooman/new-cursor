import fs from "node:fs";
import { createAgent } from "@new-cursor/agents-feature";
import {
  createClient,
  eq,
  getRawClient,
  outbox,
  repositories,
  tasks,
} from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";
import { createBareRepoFixture } from "@new-cursor/git-ops/bare-repo-fixture";
import { registerRepository } from "@new-cursor/repositories-feature";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import {
  createTaskCreatedEvent,
  insertTask,
  taskCreatedPayload,
} from "@new-cursor/tasks-feature";
import { setGitOpsRootsForTests } from "@new-cursor/worker-dispatch-feature";
import { afterEach, describe, expect, it } from "vitest";

import { createScenarioGitRoots, relayAndDispatchAll } from "../src/helpers";
import { withFreshScenario } from "../src/with-fresh-scenario";

describe("E2E-6A — lazy clone on worktree_requested", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("clones an external repository when worktree is requested", async () => {
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-6a");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });

      try {
        let repositoryId = "";
        let taskId = "";
        await db.transaction(async (tx) => {
          const agent = await createAgent(tx, { name: "e2e-clone-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: ["task_created", "task_stage_changed"],
          });
          const repository = await registerRepository(tx, {
            name: "external-fixture",
            remoteUrl: fixture.remoteUrl,
            isExternal: true,
          });
          repositoryId = repository.id;
          const task = await insertTask(tx, {
            title: "clone on demand",
            repositoryId: repository.id,
            branchName: "feat/e2e-6a",
          });
          taskId = task.id;
          const appendable = createTaskCreatedEvent({
            aggregateId: task.id,
            actorId: SYSTEM_ACTOR_ID,
            version: task.version,
            occurredAt: task.createdAt,
            payload: taskCreatedPayload({
              id: task.id,
              title: task.title,
              branchName: task.branchName,
              repositoryId: task.repositoryId,
              parentTaskId: task.parentTaskId,
            }),
          });
          const appended = await appendEvent(tx, appendable);
          await writeOutbox(tx, { ...appendable, eventId: appended.eventId });
        });

        await relayAndDispatchAll({ db, sqs: env.sqs });

        const repoRows = await db
          .select()
          .from(repositories)
          .where(eq(repositories.id, repositoryId));
        expect(repoRows[0]?.clonePath).toBeTruthy();
        expect(fs.existsSync(repoRows[0]?.clonePath ?? "")).toBe(true);

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(taskRows[0]?.stage).toBe("worktree_ready");
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});

describe("E2E-6B — golden path through worktree_ready", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("emits task_worktree_ready after worktree_requested dispatch", async () => {
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-6b");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });

      try {
        let taskId = "";
        await db.transaction(async (tx) => {
          const agent = await createAgent(tx, { name: "e2e-worktree-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: ["task_created", "task_stage_changed"],
          });
          const repository = await registerRepository(tx, {
            name: "golden-fixture",
            remoteUrl: fixture.remoteUrl,
          });
          const task = await insertTask(tx, {
            title: "golden worktree",
            repositoryId: repository.id,
            branchName: "feat/e2e-6b",
          });
          taskId = task.id;
          const appendable = createTaskCreatedEvent({
            aggregateId: task.id,
            actorId: SYSTEM_ACTOR_ID,
            version: task.version,
            occurredAt: task.createdAt,
            payload: taskCreatedPayload({
              id: task.id,
              title: task.title,
              branchName: task.branchName,
              repositoryId: task.repositoryId,
              parentTaskId: task.parentTaskId,
            }),
          });
          const appended = await appendEvent(tx, appendable);
          await writeOutbox(tx, { ...appendable, eventId: appended.eventId });
        });

        await relayAndDispatchAll({ db, sqs: env.sqs });

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(taskRows[0]?.stage).toBe("worktree_ready");
        expect(taskRows[0]?.worktreePath).toBeTruthy();

        const worktreeReadyOutbox = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "task_worktree_ready"));
        expect(worktreeReadyOutbox.length).toBeGreaterThan(0);
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});

describe("E2E-6C — conflict queue for same repo and branch", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("queues the second task when the branch is already in use", async () => {
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-6c");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });

      try {
        let firstTaskId = "";
        let secondTaskId = "";
        await db.transaction(async (tx) => {
          const agent = await createAgent(tx, { name: "e2e-queue-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: ["task_created", "task_stage_changed"],
          });
          const repository = await registerRepository(tx, {
            name: "queue-fixture",
            remoteUrl: fixture.remoteUrl,
          });

          for (const [title, slot] of [
            ["first task", "first"],
            ["second task", "second"],
          ] as const) {
            const task = await insertTask(tx, {
              title,
              repositoryId: repository.id,
              branchName: "feat/shared-branch",
            });
            if (slot === "first") {
              firstTaskId = task.id;
            } else {
              secondTaskId = task.id;
            }
            const appendable = createTaskCreatedEvent({
              aggregateId: task.id,
              actorId: SYSTEM_ACTOR_ID,
              version: task.version,
              occurredAt: task.createdAt,
              payload: taskCreatedPayload({
                id: task.id,
                title: task.title,
                branchName: task.branchName,
                repositoryId: task.repositoryId,
                parentTaskId: task.parentTaskId,
              }),
            });
            const appended = await appendEvent(tx, appendable);
            await writeOutbox(tx, { ...appendable, eventId: appended.eventId });
          }
        });

        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 8 });

        const firstRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, firstTaskId));
        const secondRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, secondTaskId));
        expect(firstRows[0]?.stage).toBe("worktree_ready");
        expect(secondRows[0]?.stage).toBe("queued");

        const queuedOutbox = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "task_queued"));
        expect(queuedOutbox.length).toBeGreaterThan(0);
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});
