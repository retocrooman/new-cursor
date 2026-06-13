import { createAgent } from "@new-cursor/agents-feature";
import { eq, runs, tasks } from "@new-cursor/db";
import { createRun } from "@new-cursor/runs-feature";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { dispatchToSubscribers } from "../src";
import { runCompletedMessage } from "./helpers";

describe("dispatch verify run_completed", () => {
  it("creates another verify run for subscribed agents", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "verify-chain-worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["run_completed"],
      });
      const task = await insertTask(tx, {
        title: "verify again",
        branchName: "feat/verify-chain",
      });
      await tx
        .update(tasks)
        .set({
          stage: "verify",
          worktreePath: "/tmp/verify-chain",
          version: 2,
        })
        .where(eq(tasks.id, task.id));

      const firstRun = await createRun(tx, {
        taskId: task.id,
        agentId: agent.id,
        stage: "verify",
        summary: null,
      });
      await tx
        .update(runs)
        .set({ status: "completed", version: 2 })
        .where(eq(runs.id, firstRun.id));

      const result = await dispatchToSubscribers(
        tx,
        runCompletedMessage({
          runId: firstRun.id,
          taskId: task.id,
          agentId: agent.id,
          status: "completed",
          stage: "verify",
          version: 2,
          occurredAt: new Date().toISOString(),
        }),
      );

      expect(result.pendingRuns).toHaveLength(1);

      const runRows = await tx
        .select()
        .from(runs)
        .where(eq(runs.taskId, task.id));
      expect(runRows).toHaveLength(2);
      expect(runRows.every((row) => row.stage === "verify")).toBe(true);
    });
  });

  it("does not create verify runs for implementing run_completed", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "implementing-worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["run_completed"],
      });
      const task = await insertTask(tx, {
        title: "still implementing",
        branchName: "feat/implementing",
      });
      await tx
        .update(tasks)
        .set({
          stage: "implementing",
          worktreePath: "/tmp/implementing",
          version: 2,
        })
        .where(eq(tasks.id, task.id));

      const run = await createRun(tx, {
        taskId: task.id,
        agentId: agent.id,
        stage: "implementing",
        summary: null,
      });
      await tx
        .update(runs)
        .set({ status: "completed", version: 2 })
        .where(eq(runs.id, run.id));

      const result = await dispatchToSubscribers(
        tx,
        runCompletedMessage({
          runId: run.id,
          taskId: task.id,
          agentId: agent.id,
          status: "completed",
          version: 2,
          occurredAt: new Date().toISOString(),
        }),
      );

      expect(result.pendingRuns).toHaveLength(0);
    });
  });
});
