import { createAgent } from "@new-cursor/agents-feature";
import { and, eq, outbox, runs, tasks } from "@new-cursor/db";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { dispatchToSubscribers } from "../src";
import { taskStageChangedMessage } from "./helpers";

describe("dispatch verify stage", () => {
  it("creates a verify run when task enters verify", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "verify-worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_stage_changed"],
      });
      const task = await insertTask(tx, {
        title: "verify me",
        branchName: "feat/verify",
      });
      await tx
        .update(tasks)
        .set({
          stage: "verify",
          worktreePath: "/tmp/verify-worktree",
          version: 2,
        })
        .where(eq(tasks.id, task.id));

      const result = await dispatchToSubscribers(
        tx,
        taskStageChangedMessage(
          { ...task, stage: "verify", worktreePath: "/tmp/verify-worktree", version: 2 },
          { fromStage: "implementing", toStage: "verify" },
        ),
      );

      expect(result.pendingRuns).toHaveLength(1);
      expect(result.pendingRuns[0]?.worktreePath).toBe("/tmp/verify-worktree");

      const runRows = await tx
        .select()
        .from(runs)
        .where(eq(runs.taskId, task.id));
      expect(runRows).toHaveLength(1);
      expect(runRows[0]?.stage).toBe("verify");
      expect(runRows[0]?.status).toBe("running");

      const startedOutbox = await tx
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.eventType, "run_started"),
            eq(outbox.aggregateId, runRows[0]!.id),
          ),
        );
      expect(startedOutbox).toHaveLength(1);
    });
  });
});
