import { eq, labels, rules } from "@new-cursor/db";
import { createRule } from "@new-cursor/rules-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("createRule", () => {
  it("creates a label-linked rule", async () => {
    await withRollbackTx(async (tx) => {
      const now = new Date();
      const [label] = await tx
        .insert(labels)
        .values({
          name: "backend",
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning({ id: labels.id });

      const projection = await createRule(tx, {
        labelId: label?.id as string,
        content: "Always write tests.",
      });

      expect(projection.content).toBe("Always write tests.");
      expect(projection.labelId).toBe(label?.id);

      const rows = await tx
        .select()
        .from(rules)
        .where(eq(rules.id, projection.id));
      expect(rows).toHaveLength(1);
    });
  });
});
