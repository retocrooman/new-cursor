import { eq, tasks } from "@new-cursor/db";
import { insertTask, updateTaskStage } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("verify stage transition", () => {
  it("transitions implementing to verify", async () => {
    await withRollbackTx(async (tx) => {
      const task = await insertTask(tx, { title: "verify stage" });
      await updateTaskStage(tx, {
        taskId: task.id,
        fromStage: "created",
        toStage: "implementing",
      });

      const { projection, updated } = await updateTaskStage(tx, {
        taskId: task.id,
        fromStage: "implementing",
        toStage: "verify",
      });

      expect(updated).toBe(true);
      expect(projection.stage).toBe("verify");

      const rows = await tx.select().from(tasks).where(eq(tasks.id, task.id));
      expect(rows[0]?.stage).toBe("verify");
    });
  });
});
