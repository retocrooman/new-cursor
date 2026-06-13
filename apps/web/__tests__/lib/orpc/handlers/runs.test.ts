import { createAgent } from "@new-cursor/agents-feature";
import type { Auth } from "@new-cursor/auth";
import type { Database, Transaction, UserRole } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { createRun } from "@new-cursor/runs-feature";
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

describe("runs.list", () => {
  it("returns runs filtered by taskId", async () => {
    await withRollbackTx(async (tx) => {
      const client = makeClient(tx, staff);
      const task = await insertTask(tx, { title: "filtered task" });
      const otherTask = await insertTask(tx, { title: "other task" });
      const agent = await createAgent(tx, { name: "worker" });

      await createRun(tx, { taskId: task.id, agentId: agent.id });
      await createRun(tx, { taskId: otherTask.id, agentId: agent.id });

      const result = await client.runs.list({
        filters: { taskId: task.id },
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.taskId).toBe(task.id);
      expect(result.rows[0]?.agentId).toBe(agent.id);
    });
  });
});
