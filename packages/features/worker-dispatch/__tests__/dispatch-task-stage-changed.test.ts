import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAgent } from "@new-cursor/agents-feature";
import { eq, outbox, repositories, tasks } from "@new-cursor/db";
import { createBareRepoFixture } from "@new-cursor/git-ops/bare-repo-fixture";
import { registerRepository } from "@new-cursor/repositories-feature";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { afterEach, describe, expect, it } from "vitest";

import { dispatchToSubscribers, setGitOpsRootsForTests } from "../src";
import { taskStageChangedMessage } from "./helpers";

describe("dispatch task_stage_changed", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("clones repository and creates worktree on worktree_requested", async () => {
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const cloneRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "dispatch-clone-root-"),
    );
    const worktreeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "dispatch-worktree-root-"),
    );
    cleanups.push(() => fs.rmSync(cloneRoot, { recursive: true, force: true }));
    cleanups.push(() =>
      fs.rmSync(worktreeRoot, { recursive: true, force: true }),
    );
    setGitOpsRootsForTests({
      cloneRoot,
      worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "worktree-worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_stage_changed"],
      });
      const repository = await registerRepository(tx, {
        name: "fixture",
        remoteUrl: fixture.remoteUrl,
      });
      const task = await insertTask(tx, {
        title: "worktree me",
        repositoryId: repository.id,
        branchName: "feat/phase-6",
      });
      await tx
        .update(tasks)
        .set({ stage: "worktree_requested", version: 2 })
        .where(eq(tasks.id, task.id));

      await dispatchToSubscribers(
        tx,
        taskStageChangedMessage(
          { ...task, stage: "worktree_requested", version: 2 },
          { fromStage: "created", toStage: "worktree_requested" },
        ),
      );

      const taskRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(taskRows[0]?.stage).toBe("worktree_ready");
      expect(taskRows[0]?.worktreePath).toBeTruthy();

      const repoRows = await tx
        .select()
        .from(repositories)
        .where(eq(repositories.id, repository.id));
      expect(repoRows[0]?.clonePath).toBeTruthy();
      expect(fs.existsSync(repoRows[0]?.clonePath ?? "")).toBe(true);

      const outboxRows = await tx.select().from(outbox);
      expect(
        outboxRows.some((row) => row.eventType === "task_worktree_ready"),
      ).toBe(true);
      expect(
        outboxRows.some(
          (row) => row.eventType === "repository_clone_completed",
        ),
      ).toBe(true);
    });
  });

  it("queues a second task for the same repo and branch", async () => {
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const cloneRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "dispatch-clone-root-"),
    );
    const worktreeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "dispatch-worktree-root-"),
    );
    cleanups.push(() => fs.rmSync(cloneRoot, { recursive: true, force: true }));
    cleanups.push(() =>
      fs.rmSync(worktreeRoot, { recursive: true, force: true }),
    );
    setGitOpsRootsForTests({
      cloneRoot,
      worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "queue-worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_stage_changed"],
      });
      const repository = await registerRepository(tx, {
        name: "fixture",
        remoteUrl: fixture.remoteUrl,
      });
      const first = await insertTask(tx, {
        title: "first",
        repositoryId: repository.id,
        branchName: "feat/shared",
      });
      const second = await insertTask(tx, {
        title: "second",
        repositoryId: repository.id,
        branchName: "feat/shared",
      });

      for (const task of [first, second]) {
        await tx
          .update(tasks)
          .set({ stage: "worktree_requested", version: 2 })
          .where(eq(tasks.id, task.id));
      }

      await dispatchToSubscribers(
        tx,
        taskStageChangedMessage(
          { ...first, stage: "worktree_requested", version: 2 },
          { fromStage: "created", toStage: "worktree_requested" },
        ),
      );

      await dispatchToSubscribers(
        tx,
        taskStageChangedMessage(
          { ...second, stage: "worktree_requested", version: 2 },
          { fromStage: "created", toStage: "worktree_requested" },
        ),
      );

      const firstRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, first.id));
      const secondRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, second.id));
      expect(firstRows[0]?.stage).toBe("worktree_ready");
      expect(secondRows[0]?.stage).toBe("queued");

      const queuedOutbox = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.eventType, "task_queued"));
      expect(queuedOutbox).toHaveLength(1);
    });
  });
});
