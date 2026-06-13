import { eq, tasks } from "@new-cursor/db";
import { insertTask, updateTaskStage } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("updateTaskStage", () => {
  it("transitions stage when fromStage matches", async () => {
    await withRollbackTx(async (tx) => {
      const task = await insertTask(tx, { title: "stage test" });

      const { projection, updated } = await updateTaskStage(tx, {
        taskId: task.id,
        fromStage: "created",
        toStage: "worktree_requested",
      });

      expect(updated).toBe(true);
      expect(projection.stage).toBe("worktree_requested");
      expect(projection.version).toBe(2);
    });
  });

  it("is idempotent when stage already transitioned", async () => {
    await withRollbackTx(async (tx) => {
      const task = await insertTask(tx, { title: "idempotent stage" });
      await updateTaskStage(tx, {
        taskId: task.id,
        fromStage: "created",
        toStage: "worktree_requested",
      });

      const { projection, updated } = await updateTaskStage(tx, {
        taskId: task.id,
        fromStage: "created",
        toStage: "worktree_requested",
      });

      expect(updated).toBe(false);
      expect(projection.stage).toBe("worktree_requested");

      const rows = await tx.select().from(tasks).where(eq(tasks.id, task.id));
      expect(rows[0]?.version).toBe(2);
    });
  });
});
