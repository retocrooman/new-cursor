import { createAgent } from "@new-cursor/agents-feature";
import { eq, outbox, tasks } from "@new-cursor/db";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { dispatchToSubscribers } from "../src/dispatch";
import { taskCreatedMessage } from "./helpers";

describe("dispatch task_created", () => {
  it("updates stage and writes task_stage_changed to outbox", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created"],
      });
      const task = await insertTask(tx, { title: "dispatch me" });

      await dispatchToSubscribers(tx, taskCreatedMessage(task));

      const rows = await tx.select().from(tasks).where(eq(tasks.id, task.id));
      expect(rows[0]?.stage).toBe("worktree_requested");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, task.id));
      expect(
        outboxRows.some((row) => row.eventType === "task_stage_changed"),
      ).toBe(true);
    });
  });
});
