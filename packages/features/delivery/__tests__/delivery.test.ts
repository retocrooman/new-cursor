import { randomUUID } from "node:crypto";
import {
  countPendingOutbox,
  listPendingOutbox,
  markOutboxRelayed,
  tryInsertInbox,
} from "@new-cursor/delivery-feature";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("outbox repository", () => {
  it("lists pending rows and marks relayed", async () => {
    await withRollbackTx(async (tx) => {
      const aggregateId = randomUUID();
      const event = {
        aggregateType: "task",
        aggregateId,
        eventType: "task_created",
        payload: { taskId: aggregateId, title: "t" },
        actorId: SYSTEM_ACTOR_ID,
        version: 1,
        occurredAt: new Date().toISOString(),
      };
      const { eventId } = await appendEvent(tx, event);
      await writeOutbox(tx, { ...event, eventId });

      expect(await countPendingOutbox(tx)).toBe(1);
      const pending = await listPendingOutbox(tx);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.eventId).toBe(eventId);

      await markOutboxRelayed(tx, eventId);
      expect(await countPendingOutbox(tx)).toBe(0);
    });
  });
});

describe("inbox idempotency", () => {
  it("returns duplicate on second insert with same eventId", async () => {
    await withRollbackTx(async (tx) => {
      const eventId = randomUUID();
      const first = await tryInsertInbox(tx, {
        eventId,
        messageId: "msg-1",
      });
      const second = await tryInsertInbox(tx, {
        eventId,
        messageId: "msg-2",
      });

      expect(first).toBe("inserted");
      expect(second).toBe("duplicate");
    });
  });
});
