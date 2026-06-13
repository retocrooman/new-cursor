import { createAgent, updateAgent } from "@new-cursor/agents-feature";
import { agentLabels, agents, eq } from "@new-cursor/db";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("createAgent", () => {
  it("creates an agent with multiple labels", async () => {
    await withRollbackTx(async (tx) => {
      const projection = await createAgent(tx, {
        name: "implementer",
        description: "implements tasks",
        labels: ["backend", "frontend"],
      });

      expect(projection.name).toBe("implementer");
      expect(projection.labels.map((l) => l.name).sort()).toEqual([
        "backend",
        "frontend",
      ]);

      const junction = await tx
        .select()
        .from(agentLabels)
        .where(eq(agentLabels.agentId, projection.id));
      expect(junction).toHaveLength(2);

      const agentRows = await tx
        .select()
        .from(agents)
        .where(eq(agents.id, projection.id));
      expect(agentRows).toHaveLength(1);
    });
  });

  it("reuses existing labels by name", async () => {
    await withRollbackTx(async (tx) => {
      const first = await createAgent(tx, {
        name: "agent-a",
        labels: ["shared"],
      });
      const second = await createAgent(tx, {
        name: "agent-b",
        labels: ["shared"],
      });

      expect(first.labels[0]?.id).toBe(second.labels[0]?.id);
    });
  });
});

describe("updateAgent", () => {
  it("updates modelId on an agent", async () => {
    await withRollbackTx(async (tx) => {
      const projection = await createAgent(tx, {
        name: "worker",
      });

      expect(projection.modelId).toBeNull();

      const updated = await updateAgent(tx, projection.id, {
        modelId: "gpt-5.5-high",
      });

      expect(updated.modelId).toBe("gpt-5.5-high");
    });
  });
});
