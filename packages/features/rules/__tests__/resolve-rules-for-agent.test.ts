import { createAgent } from "@new-cursor/agents-feature";
import { eq, labels, rules } from "@new-cursor/db";
import {
  ALL_LABEL_NAME,
  createRule,
  resolveRulesForAgent,
} from "@new-cursor/rules-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("resolveRulesForAgent", () => {
  it("returns all-label rules and agent-label rules separately", async () => {
    await withRollbackTx(async (tx) => {
      const now = new Date();
      const [allLabel] = await tx
        .insert(labels)
        .values({
          name: ALL_LABEL_NAME,
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning({ id: labels.id });
      const [backendLabel] = await tx
        .insert(labels)
        .values({
          name: "backend",
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning({ id: labels.id });

      await createRule(tx, {
        labelId: allLabel?.id as string,
        content: "Always keep diffs minimal.",
      });
      await createRule(tx, {
        labelId: backendLabel?.id as string,
        content: "Prefer repository patterns.",
      });

      const agent = await createAgent(tx, {
        name: "backend-worker",
        labels: ["backend"],
      });

      const resolved = await resolveRulesForAgent(tx, agent.id);

      expect(resolved.all.map((rule) => rule.content)).toEqual([
        "Always keep diffs minimal.",
      ]);
      expect(resolved.agent.map((rule) => rule.content)).toEqual([
        "Prefer repository patterns.",
      ]);
    });
  });

  it("deduplicates rules by id within each section", async () => {
    await withRollbackTx(async (tx) => {
      const now = new Date();
      const [backendLabel] = await tx
        .insert(labels)
        .values({
          name: "backend",
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning({ id: labels.id });
      const rule = await createRule(tx, {
        labelId: backendLabel?.id as string,
        content: "Write integration tests.",
      });

      const agent = await createAgent(tx, {
        name: "dedup-worker",
        labels: ["backend", "backend"],
      });

      const resolved = await resolveRulesForAgent(tx, agent.id);

      expect(resolved.all).toHaveLength(0);
      expect(resolved.agent).toHaveLength(1);
      expect(resolved.agent[0]?.id).toBe(rule.id);
    });
  });

  it("ignores soft-deleted rules", async () => {
    await withRollbackTx(async (tx) => {
      const now = new Date();
      const [allLabel] = await tx
        .insert(labels)
        .values({
          name: ALL_LABEL_NAME,
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning({ id: labels.id });
      const kept = await createRule(tx, {
        labelId: allLabel?.id as string,
        content: "Keep this rule.",
      });
      const deleted = await createRule(tx, {
        labelId: allLabel?.id as string,
        content: "Drop this rule.",
      });
      await tx
        .update(rules)
        .set({ deletedAt: new Date() })
        .where(eq(rules.id, deleted.id));

      const agent = await createAgent(tx, { name: "all-worker" });
      const resolved = await resolveRulesForAgent(tx, agent.id);

      expect(resolved.all.map((rule) => rule.id)).toEqual([kept.id]);
    });
  });
});
