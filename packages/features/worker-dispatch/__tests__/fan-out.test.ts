import { createAgent } from "@new-cursor/agents-feature";
import { and, eq, outbox, tasks } from "@new-cursor/db";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { dispatchToSubscribers } from "../src/dispatch";
import { taskCreatedMessage } from "./helpers";

describe("fan-out dispatch", () => {
  it("dispatches to all matching agents but updates stage once", async () => {
    await withRollbackTx(async (tx) => {
      const agentA = await createAgent(tx, { name: "fan-a" });
      const agentB = await createAgent(tx, { name: "fan-b" });
      await upsertSubscription(tx, {
        agentId: agentA.id,
        eventTypes: ["task_created"],
      });
      await upsertSubscription(tx, {
        agentId: agentB.id,
        eventTypes: ["task_created"],
      });
      const task = await insertTask(tx, { title: "fan-out" });

      const result = await dispatchToSubscribers(tx, taskCreatedMessage(task));
      expect(result.agentCount).toBe(2);
      expect(result.dispatched).toBe(2);

      const taskRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(taskRows[0]?.stage).toBe("worktree_requested");
      expect(taskRows[0]?.version).toBe(2);

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.eventType, "task_stage_changed"),
            eq(outbox.aggregateId, task.id),
          ),
        );
      expect(outboxRows).toHaveLength(2);
      expect(outboxRows.map((row) => row.actorId).sort()).toEqual(
        [agentA.id, agentB.id].sort(),
      );
    });
  });
});
