import { eq, outbox, tasks } from "@new-cursor/db";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { dispatchToSubscribers } from "../src/dispatch";
import { taskCreatedMessage } from "./helpers";

describe("no subscribers", () => {
  it("processes without side effects when no agents match", async () => {
    await withRollbackTx(async (tx) => {
      const task = await insertTask(tx, { title: "no subscribers" });

      const result = await dispatchToSubscribers(tx, taskCreatedMessage(task));
      expect(result.agentCount).toBe(0);
      expect(result.dispatched).toBe(0);

      const taskRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(taskRows[0]?.stage).toBe("created");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, task.id));
      expect(outboxRows).toHaveLength(0);
    });
  });
});
