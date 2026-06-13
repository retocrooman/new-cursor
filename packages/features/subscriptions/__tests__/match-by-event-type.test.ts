import { createAgent } from "@new-cursor/agents-feature";
import {
  listAgentsSubscribedTo,
  upsertSubscription,
} from "@new-cursor/subscriptions-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("listAgentsSubscribedTo", () => {
  it("returns agents whose eventTypes include the event type", async () => {
    await withRollbackTx(async (tx) => {
      const agentA = await createAgent(tx, { name: "agent-a" });
      const agentB = await createAgent(tx, { name: "agent-b" });
      const agentC = await createAgent(tx, { name: "agent-c" });

      await upsertSubscription(tx, {
        agentId: agentA.id,
        eventTypes: ["task_created", "run_started"],
      });
      await upsertSubscription(tx, {
        agentId: agentB.id,
        eventTypes: ["task_created"],
      });
      await upsertSubscription(tx, {
        agentId: agentC.id,
        eventTypes: ["run_started"],
      });

      const matched = await listAgentsSubscribedTo(tx, "task_created");
      expect(matched.sort()).toEqual([agentA.id, agentB.id].sort());
    });
  });

  it("returns empty array when no subscriptions match", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "agent" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["run_started"],
      });

      expect(await listAgentsSubscribedTo(tx, "task_created")).toEqual([]);
    });
  });
});
