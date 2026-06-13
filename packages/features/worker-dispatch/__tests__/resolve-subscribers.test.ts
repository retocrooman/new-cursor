import { createAgent } from "@new-cursor/agents-feature";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { resolveSubscribers } from "../src/resolve-subscribers";

describe("resolveSubscribers", () => {
  it("resolves agent ids by event type", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "subscriber" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created"],
      });

      const agentIds = await resolveSubscribers(tx, "task_created");
      expect(agentIds).toEqual([agent.id]);
    });
  });
});
