import type { Auth } from "@new-cursor/auth";
import type { Database, Transaction, UserRole } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { OrpcContext } from "@/lib/orpc/context";
import { router } from "@/lib/orpc/router";

const FAKE_UUID = "00000000-0000-0000-0000-0000000000aa";

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

describe("health endpoints (public)", () => {
  it("health returns ok without authentication", async () => {
    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, { actorId: null, role: null });
      const result = await client.health();
      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeTruthy();
    });
  });

  it("db.ping returns connected status shape", async () => {
    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, { actorId: null, role: null });
      const result = await client.db.ping();
      expect(["connected", "disconnected"]).toContain(result.status);
      expect(result.timestamp).toBeTruthy();
    });
  });
});

describe("base middleware rejects unauthenticated requests (UNAUTHORIZED)", () => {
  it("events.listByAggregate requires authentication", async () => {
    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, { actorId: null, role: null });
      await expect(
        client.events.listByAggregate({
          aggregateType: "task",
          aggregateId: FAKE_UUID,
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});

describe("authenticated events.listByAggregate", () => {
  const staff = {
    actorId: SYSTEM_ACTOR_ID,
    role: "staff" as UserRole,
  };

  it("returns empty list for unknown aggregate", async () => {
    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, staff);
      const result = await client.events.listByAggregate({
        aggregateType: "task",
        aggregateId: FAKE_UUID,
      });
      expect(result.events).toEqual([]);
    });
  });
});
