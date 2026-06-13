import { eq, tasks } from "@new-cursor/db";
import { registerRepository } from "@new-cursor/repositories-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("insertTask", () => {
  it("creates a task projection row", async () => {
    await withRollbackTx(async (tx) => {
      const projection = await insertTask(tx, {
        title: "Phase 3 task",
        branchName: "feat/demo",
      });

      expect(projection.title).toBe("Phase 3 task");
      expect(projection.stage).toBe("created");
      expect(projection.version).toBe(1);

      const rows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, projection.id));
      expect(rows).toHaveLength(1);
    });
  });

  it("accepts a valid repositoryId foreign key", async () => {
    await withRollbackTx(async (tx) => {
      const repo = await registerRepository(tx, {
        name: "demo",
        remoteUrl: "https://github.com/org/demo.git",
      });

      const projection = await insertTask(tx, {
        title: "Linked task",
        repositoryId: repo.id,
      });

      expect(projection.repositoryId).toBe(repo.id);
    });
  });
});
