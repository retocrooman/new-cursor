import type { Auth } from "@new-cursor/auth";
import {
  type Database,
  eq,
  events,
  outbox,
  type Transaction,
  taskDecisions,
  type UserRole,
} from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { insertTask } from "@new-cursor/tasks-feature";
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

  it("records decision when stub returns record_decision JSON with taskId", async () => {
    await withRollbackTx(async (tx) => {
      const task = await insertTask(tx, { title: "existing task" });
      setCommanderAgentForTests(
        new StubCommanderAgent({
          reply: `了解です。\n{"action":"record_decision","taskId":"${task.id}","summary":"API方針","context":"REST vs GraphQL","userResponse":"REST"}`,
        }),
      );

      const client = makeClient(tx, staff);
      const result = await client.commander.send({
        message: "RESTで進めます",
      });

      expect(result.reply).not.toContain("record_decision");
      const decisions = await tx
        .select()
        .from(taskDecisions)
        .where(eq(taskDecisions.taskId, task.id));
      expect(decisions).toHaveLength(1);
      expect(decisions[0]?.summary).toBe("API方針");
      expect(decisions[0]?.userResponse).toBe("REST");
    });
  });

  it("includes task context in system prompt when taskId provided", async () => {
    await withRollbackTx(async (tx) => {
      const task = await insertTask(tx, {
        title: "Context task",
        branchName: "feat/context",
        background: "Some background",
        verificationItems: "Run tests",
      });
      const stub = new StubCommanderAgent({ reply: "了解" });
      setCommanderAgentForTests(stub);

      const client = makeClient(tx, staff);
      await client.commander.send({
        message: "このタスクについて",
        taskId: task.id,
      });

      expect(stub.lastInput?.systemPrompt).toContain("Context task");
      expect(stub.lastInput?.systemPrompt).toContain(task.id);
      expect(stub.lastInput?.systemPrompt).toContain("feat/context");
      expect(stub.lastInput?.systemPrompt).toContain("Some background");
    });
  });

  it("records decision linked to newly created task when taskId omitted", async () => {
    setCommanderAgentForTests(
      new StubCommanderAgent({
        reply:
          '起票します。\n{"action":"create_task","title":"With decision","branchName":"feat/decision","repositoryId":null}\n{"action":"record_decision","summary":"検証方針","context":"手動か自動か","userResponse":"自動テスト"}',
      }),
    );

    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, staff);
      const result = await client.commander.send({
        message: "起票して",
      });

      expect(result.taskCreated?.title).toBe("With decision");
      const decisions = await tx
        .select()
        .from(taskDecisions)
        .where(eq(taskDecisions.taskId, result.taskCreated!.id));
      expect(decisions).toHaveLength(1);
      expect(decisions[0]?.summary).toBe("検証方針");
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
