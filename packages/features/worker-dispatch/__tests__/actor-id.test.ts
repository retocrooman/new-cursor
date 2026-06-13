import { createAgent } from "@new-cursor/agents-feature";
import { eq, outbox } from "@new-cursor/db";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { dispatchToSubscribers } from "../src/dispatch";
import { taskCreatedMessage } from "./helpers";

describe("actorId on worker-emitted events", () => {
  it("sets actorId to processing agentId", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "actor-agent" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created"],
      });
      const task = await insertTask(tx, { title: "actor test" });

      await dispatchToSubscribers(tx, taskCreatedMessage(task));

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.eventType, "task_stage_changed"));
      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0]?.actorId).toBe(agent.id);
    });
  });
});
