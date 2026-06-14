import { createAgent } from "@new-cursor/agents-feature";
import {
  StubCursorSdkAdapter,
  setCursorSdkAdapterForTests,
} from "@new-cursor/cursor-sdk-port";
import {
  createClient,
  eq,
  events,
  getRawClient,
  inbox,
  outbox,
  runs,
  tasks,
} from "@new-cursor/db";
import { relayPendingOutbox } from "@new-cursor/delivery-feature";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";
import { createBareRepoFixture } from "@new-cursor/git-ops/bare-repo-fixture";
import { registerRepository } from "@new-cursor/repositories-feature";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import {
  approveTask,
  createTaskCreatedEvent,
  insertTask,
  TaskFeatureError,
  taskCreatedPayload,
} from "@new-cursor/tasks-feature";
import { setGitOpsRootsForTests } from "@new-cursor/worker-dispatch-feature";
import { afterEach, describe, expect, it } from "vitest";

import { createScenarioGitRoots, relayAndDispatchAll } from "../src/helpers";
import { withFreshScenario } from "../src/with-fresh-scenario";

const PIPELINE_EVENT_TYPES = [
  "task_created",
  "task_stage_changed",
  "task_worktree_ready",
  "run_completed",
  "task_pr_requested",
  "task_pr_created",
  "approval_requested",
  "approval_granted",
  "task_waiting",
  "task_resumed",
  "task_completed",
] as const;

async function seedPipelineTask(
  db: ReturnType<typeof createClient>,
  remoteUrl: string,
) {
  let taskId = "";
  let repositoryId = "";
  await db.transaction(async (tx) => {
    const agent = await createAgent(tx, { name: "e2e-10b-worker" });
    await upsertSubscription(tx, {
      agentId: agent.id,
      eventTypes: [...PIPELINE_EVENT_TYPES],
    });
    const repository = await registerRepository(tx, {
      name: "pipeline-fixture",
      remoteUrl,
    });
    repositoryId = repository.id;
    const task = await insertTask(tx, {
      title: "phase 10b pipeline",
      repositoryId: repository.id,
      branchName: "feat/e2e-10b",
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
  return { taskId, repositoryId };
}

describe("E2E-10B — verifying → PR stub → approval pipeline", () => {
  const cleanups: Array<() => void> = [];
  const stub = new StubCursorSdkAdapter();

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    setCursorSdkAdapterForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("E2E-10B-A — golden path through approval to completed", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-10b-a");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });
      try {
        const { taskId, repositoryId } = await seedPipelineTask(
          db,
          fixture.remoteUrl,
        );
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 15 });

        let taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(["verifying", "waiting"]).toContain(taskRows[0]?.stage);
        expect(taskRows[0]?.stage).not.toBe("completed");

        await db.transaction(async (tx) => {
          await approveTask(tx, { taskId, approvedBy: SYSTEM_ACTOR_ID });
        });
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 8 });

        taskRows = await db.select().from(tasks).where(eq(tasks.id, taskId));
        expect(taskRows[0]?.stage).toBe("completed");
        expect(taskRows[0]?.pullRequestUrl).toMatch(
          `https://github.com/stub/${repositoryId}/pull/1`,
        );

        const eventRows = await db
          .select()
          .from(events)
          .where(eq(events.aggregateId, taskId));
        const eventTypes = eventRows.map((row) => row.eventType);
        for (const type of [
          "task_pr_requested",
          "task_pr_created",
          "task_waiting",
          "approval_requested",
          "approval_granted",
          "task_resumed",
          "task_completed",
        ]) {
          expect(eventTypes).toContain(type);
        }

        const runRows = await db.select().from(runs);
        expect(runRows[0]?.status).toBe("completed");
      } finally {
        await getRawClient(db).end();
      }
    });
  });

  it("E2E-10B-B — run success does not go directly to completed", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-10b-b");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });
      try {
        const { taskId } = await seedPipelineTask(db, fixture.remoteUrl);
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 15 });

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(["verifying", "waiting"]).toContain(taskRows[0]?.stage);
        expect(taskRows[0]?.stage).not.toBe("completed");

        const prRequested = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "task_pr_requested"));
        expect(prRequested.length).toBeGreaterThan(0);
      } finally {
        await getRawClient(db).end();
      }
    });
  });

  it("E2E-10B-C — stub PR URL only", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-10b-c");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });
      try {
        const { taskId, repositoryId } = await seedPipelineTask(
          db,
          fixture.remoteUrl,
        );
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 15 });

        const prCreated = await db
          .select()
          .from(events)
          .where(eq(events.eventType, "task_pr_created"));
        const row = prCreated.find((entry) => entry.aggregateId === taskId);
        expect(row).toBeTruthy();
        const payload = row?.payload as { pullRequestUrl?: string };
        expect(payload.pullRequestUrl).toBe(
          `https://github.com/stub/${repositoryId}/pull/1`,
        );
      } finally {
        await getRawClient(db).end();
      }
    });
  });

  it("E2E-10B-D — approve idempotency rejects second call", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-10b-d");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });
      try {
        const { taskId } = await seedPipelineTask(db, fixture.remoteUrl);
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 15 });

        await db.transaction(async (tx) => {
          await approveTask(tx, { taskId, approvedBy: SYSTEM_ACTOR_ID });
        });

        await expect(
          db.transaction(async (tx) => {
            await approveTask(tx, { taskId, approvedBy: SYSTEM_ACTOR_ID });
          }),
        ).rejects.toThrow();

        const granted = await db
          .select()
          .from(events)
          .where(eq(events.eventType, "approval_granted"));
        expect(
          granted.filter((row) => row.aggregateId === taskId),
        ).toHaveLength(1);
      } finally {
        await getRawClient(db).end();
      }
    });
  });

  it("E2E-10B-E — rejects approve when not waiting", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-10b-e");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });
      try {
        const { taskId } = await seedPipelineTask(db, fixture.remoteUrl);
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 3 });

        await expect(
          db.transaction(async (tx) => {
            await approveTask(tx, { taskId, approvedBy: SYSTEM_ACTOR_ID });
          }),
        ).rejects.toThrow();

        const granted = await db
          .select()
          .from(events)
          .where(eq(events.eventType, "approval_granted"));
        expect(granted.some((row) => row.aggregateId === taskId)).toBe(false);
      } finally {
        await getRawClient(db).end();
      }
    });
  });

  it("E2E-10B-F — run error keeps implementing stage", async () => {
    setCursorSdkAdapterForTests(new StubCursorSdkAdapter({ shouldFail: true }));
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-10b-f");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });
      try {
        const { taskId } = await seedPipelineTask(db, fixture.remoteUrl);
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 12 });

        const runRows = await db.select().from(runs);
        expect(runRows[0]?.status).toBe("error");

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(taskRows[0]?.stage).toBe("implementing");

        const prRequested = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "task_pr_requested"));
        expect(prRequested.some((row) => row.aggregateId === taskId)).toBe(
          false,
        );
      } finally {
        await getRawClient(db).end();
      }
    });
  });

  it("E2E-10B-G — queued release only after approval completed", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-10b-g");
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
          const agent = await createAgent(tx, { name: "e2e-10b-g-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: [...PIPELINE_EVENT_TYPES],
          });
          const repository = await registerRepository(tx, {
            name: "release-fixture-10b",
            remoteUrl: fixture.remoteUrl,
          });
          for (const [title, slot] of [
            ["first 10b release", "first"],
            ["second 10b release", "second"],
          ] as const) {
            const task = await insertTask(tx, {
              title,
              repositoryId: repository.id,
              branchName: "feat/shared-10b-release",
            });
            if (slot === "first") firstTaskId = task.id;
            else secondTaskId = task.id;
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

        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 15 });

        const secondAfterRun = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, secondTaskId));
        expect(secondAfterRun[0]?.stage).toBe("queued");

        await db.transaction(async (tx) => {
          await approveTask(tx, {
            taskId: firstTaskId,
            approvedBy: SYSTEM_ACTOR_ID,
          });
        });
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 8 });

        const secondAfterApprove = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, secondTaskId));
        expect(secondAfterApprove[0]?.stage).not.toBe("queued");
      } finally {
        await getRawClient(db).end();
      }
    });
  });

  it("E2E-10B-H — outbox relay and inbox processing for task_pr_requested", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-10b-h");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });
      try {
        const { taskId } = await seedPipelineTask(db, fixture.remoteUrl);
        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 12 });

        const prRequestedOutbox = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "task_pr_requested"));
        const row = prRequestedOutbox.find(
          (entry) => entry.aggregateId === taskId,
        );
        expect(row?.relayedAt).toBeTruthy();

        const prCreatedInbox = await db.select().from(inbox);
        expect(
          prCreatedInbox.some((entry) => entry.status === "processed"),
        ).toBe(true);

        await relayPendingOutbox({ db, sqs: env.sqs });
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});

describe("E2E-10B-E — TaskFeatureError on invalid approve", () => {
  it("throws invalidTransition for non-waiting stage", () => {
    expect(
      TaskFeatureError.invalidTransition("id", "implementing", "completed", [
        "waiting",
      ]).code,
    ).toBe("PRECONDITION_FAILED");
  });
});
