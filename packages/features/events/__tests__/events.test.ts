import { randomUUID } from "node:crypto";
import { events, type Transaction, users } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { listByAggregate } from "../src";

async function insertUser(
  tx: Transaction,
  input: { name: string; email: string },
): Promise<string> {
  const [row] = await tx
    .insert(users)
    .values({ name: input.name, email: input.email })
    .returning({ id: users.id });
  if (!row) throw new Error("failed to insert user");
  return row.id;
}

async function insertEvent(
  tx: Transaction,
  input: {
    aggregateType: string;
    aggregateId: string;
    actorId: string;
    version: number;
    eventType?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(events).values({
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    eventType: input.eventType ?? "test_created",
    payload: input.payload ?? { note: "test" },
    actorId: input.actorId,
    version: input.version,
  });
}

describe("listByAggregate", () => {
  it("version 昇順（古い → 新しい）で返す", async () => {
    await withRollbackTx(async (tx) => {
      const aggregateId = randomUUID();
      for (let v = 3; v >= 1; v--) {
        await insertEvent(tx, {
          aggregateType: "task",
          aggregateId,
          actorId: SYSTEM_ACTOR_ID,
          version: v,
        });
      }

      const result = await listByAggregate(tx, "task", aggregateId);

      expect(result.map((e) => e.version)).toEqual([1, 2, 3]);
    });
  });

  it("aggregateId が異なる event は返さない", async () => {
    await withRollbackTx(async (tx) => {
      const targetId = randomUUID();
      const otherId = randomUUID();
      await insertEvent(tx, {
        aggregateType: "task",
        aggregateId: targetId,
        actorId: SYSTEM_ACTOR_ID,
        version: 1,
      });
      await insertEvent(tx, {
        aggregateType: "task",
        aggregateId: otherId,
        actorId: SYSTEM_ACTOR_ID,
        version: 1,
      });

      const result = await listByAggregate(tx, "task", targetId);

      expect(result).toHaveLength(1);
      expect(result[0]?.aggregateId).toBe(targetId);
    });
  });

  it("aggregateType が異なる event は返さない", async () => {
    await withRollbackTx(async (tx) => {
      const aggregateId = randomUUID();
      await insertEvent(tx, {
        aggregateType: "task",
        aggregateId,
        actorId: SYSTEM_ACTOR_ID,
        version: 1,
      });

      const result = await listByAggregate(tx, "run", aggregateId);

      expect(result).toEqual([]);
    });
  });

  it("payload は parse せず unknown のまま透過する", async () => {
    await withRollbackTx(async (tx) => {
      const aggregateId = randomUUID();
      const customPayload = { note: "テスト", extra: 42 };
      await insertEvent(tx, {
        aggregateType: "task",
        aggregateId,
        actorId: SYSTEM_ACTOR_ID,
        version: 1,
        payload: customPayload,
      });

      const result = await listByAggregate(tx, "task", aggregateId);

      expect(result[0]?.payload).toEqual(customPayload);
    });
  });

  it("actorId（実 user / システム）と createdAt(ISO) を透過する", async () => {
    await withRollbackTx(async (tx) => {
      const userId = await insertUser(tx, {
        name: "山田 太郎",
        email: `test-${randomUUID()}@example.com`,
      });
      const aggregateId = randomUUID();
      await insertEvent(tx, {
        aggregateType: "task",
        aggregateId,
        actorId: userId,
        version: 1,
        eventType: "task_created",
        payload: { title: "sample" },
      });

      const result = await listByAggregate(tx, "task", aggregateId);

      expect(result[0]?.actorId).toBe(userId);
      expect(result[0]?.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });
  });
});
