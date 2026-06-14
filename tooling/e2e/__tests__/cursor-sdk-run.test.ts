import { createAgent } from "@new-cursor/agents-feature";
import {
  StubCursorSdkAdapter,
  setCursorSdkAdapterForTests,
} from "@new-cursor/cursor-sdk-port";
import {
  createClient,
  eq,
  getRawClient,
  outbox,
  runs,
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

describe("E2E-7A — task_worktree_ready creates run and run_started", () => {
  const cleanups: Array<() => void> = [];
  const stub = new StubCursorSdkAdapter();

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    setCursorSdkAdapterForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("dispatches task_worktree_ready into run_started with stub cwd", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-7a");
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
          const agent = await createAgent(tx, { name: "e2e-run-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: [
              "task_created",
              "task_stage_changed",
              "task_worktree_ready",
            ],
          });
          const repository = await registerRepository(tx, {
            name: "run-fixture",
            remoteUrl: fixture.remoteUrl,
          });
          const task = await insertTask(tx, {
            title: "phase 7 run",
            repositoryId: repository.id,
            branchName: "feat/e2e-7a",
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

        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 10 });

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(taskRows[0]?.worktreePath).toBeTruthy();

        const runRows = await db.select().from(runs);
        expect(runRows).toHaveLength(1);

        const startedOutbox = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "run_started"));
        expect(startedOutbox.length).toBeGreaterThan(0);
        expect(stub.lastCwd).toBe(taskRows[0]?.worktreePath);
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});

describe("E2E-7B — stub success completes run and task", () => {
  const cleanups: Array<() => void> = [];
  const stub = new StubCursorSdkAdapter();

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    setCursorSdkAdapterForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("emits run_completed and moves task to verifying or waiting", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-7b");
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
          const agent = await createAgent(tx, { name: "e2e-complete-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: [
              "task_created",
              "task_stage_changed",
              "task_worktree_ready",
              "task_pr_requested",
              "task_pr_created",
            ],
          });
          const repository = await registerRepository(tx, {
            name: "complete-fixture",
            remoteUrl: fixture.remoteUrl,
          });
          const task = await insertTask(tx, {
            title: "phase 7 complete",
            repositoryId: repository.id,
            branchName: "feat/e2e-7b",
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

        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 10 });

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(["verifying", "waiting"]).toContain(taskRows[0]?.stage);

        const runRows = await db.select().from(runs);
        expect(runRows[0]?.status).toBe("completed");
        expect(runRows[0]?.cursorAgentId).toBe("agent-stub-success");

        const completedOutbox = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "run_completed"));
        expect(completedOutbox.length).toBeGreaterThan(0);
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});

describe("E2E-7C — stub failure records error status", () => {
  const cleanups: Array<() => void> = [];
  const stub = new StubCursorSdkAdapter({
    shouldFail: true,
    errorMessage: "e2e sdk failure",
  });

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    setCursorSdkAdapterForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("records error on run without completing task", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-7c");
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
          const agent = await createAgent(tx, { name: "e2e-error-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: [
              "task_created",
              "task_stage_changed",
              "task_worktree_ready",
            ],
          });
          const repository = await registerRepository(tx, {
            name: "error-fixture",
            remoteUrl: fixture.remoteUrl,
          });
          const task = await insertTask(tx, {
            title: "phase 7 error",
            repositoryId: repository.id,
            branchName: "feat/e2e-7c",
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

        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 10 });

        const runRows = await db.select().from(runs);
        expect(runRows[0]?.status).toBe("error");
        expect(runRows[0]?.errorMessage).toBe("e2e sdk failure");

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(taskRows[0]?.stage).toBe("implementing");
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});
