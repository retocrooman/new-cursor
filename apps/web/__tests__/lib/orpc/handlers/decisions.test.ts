import { createAgent } from "@new-cursor/agents-feature";
import type { Auth } from "@new-cursor/auth";
import type { Database, Transaction, UserRole } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { insertTask } from "@new-cursor/tasks-feature";
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

describe("decisions.listByTask", () => {
  it("returns decision records for a task", async () => {
    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, staff);
      const task = await insertTask(tx, { title: "decision task" });
      const otherTask = await insertTask(tx, { title: "other task" });
      const agent = await createAgent(tx, { name: "planner" });

      await client.decisions.create({
        taskId: task.id,
        summary: "API 設計方針",
        context: "REST vs GraphQL",
        userResponse: "REST で進める",
        agentId: agent.id,
      });
      await client.decisions.create({
        taskId: otherTask.id,
        summary: "unrelated",
      });

      const result = await client.decisions.listByTask({ taskId: task.id });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.summary).toBe("API 設計方針");
      expect(result.rows[0]?.userResponse).toBe("REST で進める");
      expect(result.rows[0]?.agentId).toBe(agent.id);
    });
  });
});
