import { createAgent } from "@new-cursor/agents-feature";
import {
  StubCursorSdkAdapter,
  setCursorSdkAdapterForTests,
} from "@new-cursor/cursor-sdk-port";
import { eq, outbox, runs, taskDecisions, tasks } from "@new-cursor/db";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { testDb, withRollbackTx } from "@new-cursor/vitest-config/setup";
import { afterEach, describe, expect, it } from "vitest";

import { dispatchToSubscribers, executePendingRuns } from "../src";
import { taskWorktreeReadyMessage } from "./helpers";

describe("dispatch task_worktree_ready", () => {
  afterEach(() => {
    setCursorSdkAdapterForTests(undefined);
  });

  it("creates a run and run_started outbox entry", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "run-worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_worktree_ready"],
      });
      const task = await insertTask(tx, {
        title: "implement me",
        branchName: "feat/phase-7",
      });
      await tx
        .update(tasks)
        .set({
          stage: "worktree_ready",
          worktreePath: "/tmp/worktree",
          version: 2,
        })
        .where(eq(tasks.id, task.id));

      const result = await dispatchToSubscribers(
        tx,
        taskWorktreeReadyMessage(
          {
            ...task,
            stage: "worktree_ready",
            worktreePath: "/tmp/worktree",
            version: 2,
          },
          {
            worktreePath: "/tmp/worktree",
            branchName: "feat/phase-7",
          },
        ),
      );

      expect(result.pendingRuns).toHaveLength(1);
      expect(result.pendingRuns[0]?.worktreePath).toBe("/tmp/worktree");

      const runRows = await tx
        .select()
        .from(runs)
        .where(eq(runs.taskId, task.id));
      expect(runRows).toHaveLength(1);
      expect(runRows[0]?.status).toBe("running");

      const taskRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(taskRows[0]?.stage).toBe("implementing");

      const startedOutbox = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, runRows[0]!.id));
      expect(startedOutbox).toHaveLength(1);
      expect(startedOutbox[0]?.eventType).toBe("run_started");
    });
  });

  it("completes run and task when stub succeeds", async () => {
    const stub = new StubCursorSdkAdapter();
    setCursorSdkAdapterForTests(stub);
    let taskId = "";
    let pendingRuns: Awaited<
      ReturnType<typeof dispatchToSubscribers>
    >["pendingRuns"] = [];

    await testDb.transaction(async (tx) => {
      const agent = await createAgent(tx, { name: "run-worker-success" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_worktree_ready"],
      });
      const task = await insertTask(tx, {
        title: "finish me",
        branchName: "feat/done",
      });
      taskId = task.id;
      await tx
        .update(tasks)
        .set({
          stage: "worktree_ready",
          worktreePath: "/tmp/finish-worktree",
          version: 2,
        })
        .where(eq(tasks.id, task.id));

      const result = await dispatchToSubscribers(
        tx,
        taskWorktreeReadyMessage(
          {
            ...task,
            stage: "worktree_ready",
            worktreePath: "/tmp/finish-worktree",
            version: 2,
          },
          {
            worktreePath: "/tmp/finish-worktree",
            branchName: "feat/done",
          },
        ),
      );
      pendingRuns = result.pendingRuns;
    });

    await executePendingRuns(testDb, pendingRuns, stub);

    expect(stub.lastCwd).toBe("/tmp/finish-worktree");

    const runRows = await testDb.select().from(runs);
    const run = runRows.find((row) => row.taskId === taskId);
    expect(run?.status).toBe("completed");
    expect(run?.cursorAgentId).toBe("agent-stub-success");

    const taskRows = await testDb
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    expect(taskRows[0]?.stage).toBe("verifying");

    const completedOutbox = await testDb
      .select()
      .from(outbox)
      .where(eq(outbox.eventType, "run_completed"));
    expect(completedOutbox.some((row) => row.aggregateId === run?.id)).toBe(
      true,
    );
  });

  it("records decision when stub summary contains record_decision JSON", async () => {
    const stub = new StubCursorSdkAdapter({
      summary:
        'done.\n{"action":"record_decision","summary":"lib choice","context":"A vs B","userResponse":"A"}',
    });
    setCursorSdkAdapterForTests(stub);
    let taskId = "";
    let pendingRuns: Awaited<
      ReturnType<typeof dispatchToSubscribers>
    >["pendingRuns"] = [];

    await testDb.transaction(async (tx) => {
      const agent = await createAgent(tx, { name: "run-worker-decision" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_worktree_ready"],
      });
      const task = await insertTask(tx, {
        title: "decide me",
        branchName: "feat/decide",
      });
      taskId = task.id;
      await tx
        .update(tasks)
        .set({
          stage: "worktree_ready",
          worktreePath: "/tmp/decide-worktree",
          version: 2,
        })
        .where(eq(tasks.id, task.id));

      const result = await dispatchToSubscribers(
        tx,
        taskWorktreeReadyMessage(
          {
            ...task,
            stage: "worktree_ready",
            worktreePath: "/tmp/decide-worktree",
            version: 2,
          },
          {
            worktreePath: "/tmp/decide-worktree",
            branchName: "feat/decide",
          },
        ),
      );
      pendingRuns = result.pendingRuns;
    });

    await executePendingRuns(testDb, pendingRuns, stub);

    const decisionRows = await testDb
      .select()
      .from(taskDecisions)
      .where(eq(taskDecisions.taskId, taskId));
    expect(decisionRows).toHaveLength(1);
    expect(decisionRows[0]?.summary).toBe("lib choice");
    expect(decisionRows[0]?.agentId).toBe(pendingRuns[0]?.agentId);
  });

  it("records error status when stub fails", async () => {
    const stub = new StubCursorSdkAdapter({
      shouldFail: true,
      errorMessage: "sdk boom",
    });
    setCursorSdkAdapterForTests(stub);
    let taskId = "";
    let pendingRuns: Awaited<
      ReturnType<typeof dispatchToSubscribers>
    >["pendingRuns"] = [];

    await testDb.transaction(async (tx) => {
      const agent = await createAgent(tx, { name: "run-worker-fail" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_worktree_ready"],
      });
      const task = await insertTask(tx, {
        title: "fail me",
        branchName: "feat/fail",
      });
      taskId = task.id;
      await tx
        .update(tasks)
        .set({
          stage: "worktree_ready",
          worktreePath: "/tmp/fail-worktree",
          version: 2,
        })
        .where(eq(tasks.id, task.id));

      const result = await dispatchToSubscribers(
        tx,
        taskWorktreeReadyMessage(
          {
            ...task,
            stage: "worktree_ready",
            worktreePath: "/tmp/fail-worktree",
            version: 2,
          },
          {
            worktreePath: "/tmp/fail-worktree",
            branchName: "feat/fail",
          },
        ),
      );
      pendingRuns = result.pendingRuns;
    });

    await executePendingRuns(testDb, pendingRuns, stub);

    const runRows = await testDb.select().from(runs);
    const run = runRows.find((row) => row.taskId === taskId);
    expect(run?.status).toBe("error");
    expect(run?.errorMessage).toBe("sdk boom");

    const taskRows = await testDb
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    expect(taskRows[0]?.stage).toBe("implementing");
  });
});
