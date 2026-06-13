import { randomUUID } from "node:crypto";
import type { Auth } from "@new-cursor/auth";
import {
  type Database,
  events,
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

describe("events.listByAggregate tolerates unknown event types", () => {
  it("returns rows as payload:null unknown fallback", async () => {
    await withRollbackTx(async (tx) => {
      const aggregateId = randomUUID();
      await tx.insert(events).values({
        aggregateType: "task",
        aggregateId,
        eventType: "task_created",
        payload: { title: "test" },
        actorId: SYSTEM_ACTOR_ID,
        version: 1,
      });
      await tx.insert(events).values({
        aggregateType: "task",
        aggregateId,
        eventType: "task_future_event_type",
        payload: { anything: 42 },
        actorId: SYSTEM_ACTOR_ID,
        version: 2,
      });

      const client = makeClient(tx, staff);
      const result = await client.events.listByAggregate({
        aggregateType: "task",
        aggregateId,
      });

      expect(result.events).toHaveLength(2);
      expect(result.events[0]?.payload).toBeNull();
      expect(result.events[1]?.payload).toBeNull();
    });
  });
});
