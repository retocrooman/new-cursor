import { createAgent } from "@new-cursor/agents-feature";
import { eq, subscriptions } from "@new-cursor/db";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("upsertSubscription", () => {
  it("creates a subscription for an agent", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "worker" });
      const projection = await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created", "run_started"],
      });

      expect(projection.agentId).toBe(agent.id);
      expect(projection.eventTypes).toEqual(["task_created", "run_started"]);
    });
  });

  it("updates event types on second upsert", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created"],
      });
      const updated = await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["run_started"],
      });

      expect(updated.eventTypes).toEqual(["run_started"]);
      expect(updated.version).toBe(2);

      const rows = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.agentId, agent.id));
      expect(rows).toHaveLength(1);
    });
  });
});
