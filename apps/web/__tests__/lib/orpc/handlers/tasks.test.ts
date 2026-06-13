import type { Auth } from "@new-cursor/auth";
import {
  type Database,
  eq,
  events,
  outbox,
  type Transaction,
  type UserRole,
} from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { OrpcContext } from "@/lib/orpc/context";
import { router } from "@/lib/orpc/router";

function makeClient(
  tx: Transaction,
  ctx: { actorId: string | null; role: UserRole | null },
) {
  return createRouterClient(router, {
    context: (): OrpcContext => ({
      db: tx as unknown as Database,
      actorId: ctx.actorId,
      role: ctx.role,
      auth: undefined as unknown as Auth,
      request: null,
    }),
  });
}

const staff = {
  actorId: SYSTEM_ACTOR_ID,
  role: "staff" as UserRole,
};

describe("tasks.create", () => {
  it("writes task, event, and outbox in one transaction", async () => {
    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, staff);
      const task = await client.tasks.create({
        title: "Outbox slice",
        branchName: "feat/outbox",
      });

      expect(task.title).toBe("Outbox slice");

      const eventRows = await tx
        .select()
        .from(events)
        .where(eq(events.aggregateId, task.id));
      expect(eventRows).toHaveLength(1);
      expect(eventRows[0]?.eventType).toBe("task_created");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, task.id));
      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0]?.relayedAt).toBeNull();
      expect(outboxRows[0]?.eventId).toBe(eventRows[0]?.id);
    });
  });
});
