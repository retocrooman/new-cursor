import { createAgent } from "@new-cursor/agents-feature";
import { eq, outbox, tasks } from "@new-cursor/db";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { dispatchToSubscribers } from "../src/dispatch";
import { taskCreatedMessage } from "./helpers";

describe("unknown event type", () => {
  it("skips gracefully when no handler is registered", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["run_started"],
      });
      const task = await insertTask(tx, { title: "unknown event" });
      const message = {
        ...taskCreatedMessage(task),
        eventType: "run_started",
      };

      const result = await dispatchToSubscribers(tx, message);
      expect(result.agentCount).toBe(0);
      expect(result.dispatched).toBe(0);

      const taskRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(taskRows[0]?.stage).toBe("created");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, task.id));
      expect(outboxRows).toHaveLength(0);
    });
  });
});
