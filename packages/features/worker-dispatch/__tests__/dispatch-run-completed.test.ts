import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAgent } from "@new-cursor/agents-feature";
import { eq, outbox, runs, tasks } from "@new-cursor/db";
import { createBareRepoFixture } from "@new-cursor/git-ops/bare-repo-fixture";
import { registerRepository } from "@new-cursor/repositories-feature";
import { createRun } from "@new-cursor/runs-feature";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { afterEach, describe, expect, it } from "vitest";

import { dispatchToSubscribers, setGitOpsRootsForTests } from "../src";
import { runCompletedMessage, taskStageChangedMessage } from "./helpers";

describe("dispatch run_completed queued release", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  async function setupQueuedPair(
    tx: Parameters<typeof withRollbackTx>[0] extends (tx: infer T) => unknown
      ? T
      : never,
  ) {
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

    const agent = await createAgent(tx, {
      name: "queued-release-worker",
    });
    await upsertSubscription(tx, {
      agentId: agent.id,
      eventTypes: ["task_stage_changed", "run_completed"],
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

    return { agent, repository, first, second };
  }

  it("releases the oldest queued task when the blocking task completes", async () => {
    await withRollbackTx(async (tx) => {
      const { agent, first, second } = await setupQueuedPair(tx);

      await tx
        .update(tasks)
        .set({ stage: "completed", version: 4 })
        .where(eq(tasks.id, first.id));

      const run = await createRun(tx, {
        taskId: first.id,
        agentId: agent.id,
        stage: "implementing",
        summary: null,
      });
      await tx
        .update(runs)
        .set({ status: "completed", version: 2 })
        .where(eq(runs.id, run.id));

      await dispatchToSubscribers(
        tx,
        runCompletedMessage({
          runId: run.id,
          taskId: first.id,
          agentId: agent.id,
          status: "completed",
          version: 2,
          occurredAt: new Date().toISOString(),
        }),
      );

      const secondRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, second.id));
      expect(secondRows[0]?.stage).toBe("worktree_requested");

      const releaseOutbox = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.eventType, "task_stage_changed"));
      expect(
        releaseOutbox.some((row) => {
          const payload = row.payload as {
            taskId?: string;
            fromStage?: string;
            toStage?: string;
          };
          return (
            payload.taskId === second.id &&
            payload.fromStage === "queued" &&
            payload.toStage === "worktree_requested"
          );
        }),
      ).toBe(true);
    });
  });

  it("does not release queued tasks when run_completed has error status", async () => {
    await withRollbackTx(async (tx) => {
      const { agent, first, second } = await setupQueuedPair(tx);

      await tx
        .update(tasks)
        .set({ stage: "implementing", version: 4 })
        .where(eq(tasks.id, first.id));

      const run = await createRun(tx, {
        taskId: first.id,
        agentId: agent.id,
        stage: "implementing",
        summary: null,
      });
      await tx
        .update(runs)
        .set({ status: "error", version: 2 })
        .where(eq(runs.id, run.id));

      await dispatchToSubscribers(
        tx,
        runCompletedMessage({
          runId: run.id,
          taskId: first.id,
          agentId: agent.id,
          status: "error",
          version: 2,
          occurredAt: new Date().toISOString(),
        }),
      );

      const secondRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, second.id));
      expect(secondRows[0]?.stage).toBe("queued");
    });
  });

  it("does not double-release when run_completed is dispatched twice", async () => {
    await withRollbackTx(async (tx) => {
      const { agent, first, second } = await setupQueuedPair(tx);

      await tx
        .update(tasks)
        .set({ stage: "completed", version: 4 })
        .where(eq(tasks.id, first.id));

      const run = await createRun(tx, {
        taskId: first.id,
        agentId: agent.id,
        stage: "implementing",
        summary: null,
      });
      await tx
        .update(runs)
        .set({ status: "completed", version: 2 })
        .where(eq(runs.id, run.id));

      const message = runCompletedMessage({
        runId: run.id,
        taskId: first.id,
        agentId: agent.id,
        status: "completed",
        version: 2,
        occurredAt: new Date().toISOString(),
      });

      await dispatchToSubscribers(tx, message);
      await dispatchToSubscribers(tx, message);

      const releaseOutbox = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.eventType, "task_stage_changed"));
      const releases = releaseOutbox.filter((row) => {
        const payload = row.payload as {
          taskId?: string;
          fromStage?: string;
          toStage?: string;
        };
        return (
          payload.taskId === second.id &&
          payload.fromStage === "queued" &&
          payload.toStage === "worktree_requested"
        );
      });
      expect(releases).toHaveLength(1);
    });
  });

  it("does not release when another task still blocks the branch", async () => {
    await withRollbackTx(async (tx) => {
      const { agent, first, second } = await setupQueuedPair(tx);

      await tx
        .update(tasks)
        .set({ stage: "completed", version: 4 })
        .where(eq(tasks.id, first.id));

      const third = await insertTask(tx, {
        title: "third",
        repositoryId: first.repositoryId,
        branchName: "feat/shared",
      });
      await tx
        .update(tasks)
        .set({
          stage: "worktree_ready",
          worktreePath: "/tmp/blocker",
          version: 3,
        })
        .where(eq(tasks.id, third.id));

      const run = await createRun(tx, {
        taskId: first.id,
        agentId: agent.id,
        stage: "implementing",
        summary: null,
      });
      await tx
        .update(runs)
        .set({ status: "completed", version: 2 })
        .where(eq(runs.id, run.id));

      await dispatchToSubscribers(
        tx,
        runCompletedMessage({
          runId: run.id,
          taskId: first.id,
          agentId: agent.id,
          status: "completed",
          version: 2,
          occurredAt: new Date().toISOString(),
        }),
      );

      const secondRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, second.id));
      expect(secondRows[0]?.stage).toBe("queued");
    });
  });
});
