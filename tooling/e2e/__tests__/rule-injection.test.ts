import { createAgent } from "@new-cursor/agents-feature";
import {
  StubCursorSdkAdapter,
  setCursorSdkAdapterForTests,
} from "@new-cursor/cursor-sdk-port";
import { createClient, eq, getRawClient, labels, tasks } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";
import { createBareRepoFixture } from "@new-cursor/git-ops/bare-repo-fixture";
import { registerRepository } from "@new-cursor/repositories-feature";
import { ALL_LABEL_NAME, createRule } from "@new-cursor/rules-feature";
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

async function seedLabel(
  tx: Parameters<
    Parameters<ReturnType<typeof createClient>["transaction"]>[0]
  >[0],
  name: string,
): Promise<string> {
  const now = new Date();
  const [label] = await tx
    .insert(labels)
    .values({
      name,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
    .returning({ id: labels.id });
  if (!label) {
    throw new Error(`Failed to seed label "${name}"`);
  }
  return label.id;
}

describe("E2E-8A — agent label rules appear in stub prompt", () => {
  const cleanups: Array<() => void> = [];
  const stub = new StubCursorSdkAdapter();

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    setCursorSdkAdapterForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("includes agent-label rule content in the run prompt", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-8a");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });

      try {
        await db.transaction(async (tx) => {
          const backendLabelId = await seedLabel(tx, "backend");
          await createRule(tx, {
            labelId: backendLabelId,
            content: "E2E agent rule: prefer small diffs.",
          });
          const agent = await createAgent(tx, {
            name: "e2e-rule-worker",
            labels: ["backend"],
          });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: [
              "task_created",
              "task_stage_changed",
              "task_worktree_ready",
            ],
          });
          const repository = await registerRepository(tx, {
            name: "rule-fixture-8a",
            remoteUrl: fixture.remoteUrl,
          });
          const task = await insertTask(tx, {
            title: "phase 8 agent rule",
            repositoryId: repository.id,
            branchName: "feat/e2e-8a",
          });
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

        expect(stub.lastPrompt).toContain("# Rules (agent)");
        expect(stub.lastPrompt).toContain(
          "E2E agent rule: prefer small diffs.",
        );
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});

describe("E2E-8B — all label rules appear for every agent", () => {
  const cleanups: Array<() => void> = [];
  const stub = new StubCursorSdkAdapter();

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    setCursorSdkAdapterForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("includes all-label rule content in the run prompt", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-8b");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });

      try {
        await db.transaction(async (tx) => {
          const allLabelId = await seedLabel(tx, ALL_LABEL_NAME);
          await createRule(tx, {
            labelId: allLabelId,
            content: "E2E all rule: write in Japanese.",
          });
          const agent = await createAgent(tx, { name: "e2e-all-rule-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: [
              "task_created",
              "task_stage_changed",
              "task_worktree_ready",
            ],
          });
          const repository = await registerRepository(tx, {
            name: "rule-fixture-8b",
            remoteUrl: fixture.remoteUrl,
          });
          const task = await insertTask(tx, {
            title: "phase 8 all rule",
            repositoryId: repository.id,
            branchName: "feat/e2e-8b",
          });
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

        expect(stub.lastPrompt).toContain("# Rules (all)");
        expect(stub.lastPrompt).toContain("E2E all rule: write in Japanese.");
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});

describe("E2E-8C — no rules keeps task-only prompt", () => {
  const cleanups: Array<() => void> = [];
  const stub = new StubCursorSdkAdapter();

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    setCursorSdkAdapterForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("omits rules headers when no rules exist", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-8c");
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
          const agent = await createAgent(tx, { name: "e2e-no-rule-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: [
              "task_created",
              "task_stage_changed",
              "task_worktree_ready",
            ],
          });
          const repository = await registerRepository(tx, {
            name: "rule-fixture-8c",
            remoteUrl: fixture.remoteUrl,
          });
          const task = await insertTask(tx, {
            title: "phase 8 no rules",
            repositoryId: repository.id,
            branchName: "feat/e2e-8c",
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

        expect(stub.lastPrompt).not.toContain("# Rules (all)");
        expect(stub.lastPrompt).not.toContain("# Rules (agent)");
        expect(stub.lastPrompt).toContain("# Task");
        expect(stub.lastPrompt).toContain("Title: phase 8 no rules");

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(taskRows[0]?.worktreePath).toBeTruthy();
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});
