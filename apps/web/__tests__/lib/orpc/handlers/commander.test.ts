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
import { afterEach, describe, expect, it } from "vitest";
import {
  clearAllCommanderSessionsForTests,
  StubCommanderAgent,
  setCommanderAgentForTests,
} from "@/lib/commander";

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

afterEach(() => {
  setCommanderAgentForTests(undefined);
  clearAllCommanderSessionsForTests();
});

describe("commander.send", () => {
  it("creates task when stub agent returns create_task JSON", async () => {
    setCommanderAgentForTests(new StubCommanderAgent());

    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, staff);
      const result = await client.commander.send({
        message: "タスクを起票して",
      });

      expect(result.reply).not.toContain("create_task");
      expect(result.taskCreated?.title).toBe("Stub task");

      const eventRows = await tx
        .select()
        .from(events)
        .where(eq(events.aggregateId, result.taskCreated!.id));
      expect(eventRows).toHaveLength(1);
      expect(eventRows[0]?.eventType).toBe("task_created");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, result.taskCreated!.id));
      expect(outboxRows).toHaveLength(1);
    });
  });
});

describe("commander.reset", () => {
  it("clears stored agent session", async () => {
    setCommanderAgentForTests(new StubCommanderAgent());

    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, staff);
      const first = await client.commander.send({ message: "hello" });
      expect(first.agentId).toBeTruthy();

      await client.commander.reset();

      const stub = new StubCommanderAgent();
      setCommanderAgentForTests(stub);
      await client.commander.send({ message: "again" });
      expect(stub.lastInput?.agentId).toBeUndefined();
    });
  });
});
