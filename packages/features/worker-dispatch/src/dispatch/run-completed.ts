import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";
import { removeTaskWorktree } from "@new-cursor/git-ops";
import { findRepositoryById } from "@new-cursor/repositories-feature";
import { runCompletedPayloadSchema } from "@new-cursor/runs-feature";
import {
  createTaskStageChangedEvent,
  findBlockingTaskForRepoBranch,
  findOldestQueuedTaskForRepoBranch,
  findTaskById,
  taskStageChangedPayload,
  updateTaskStage,
} from "@new-cursor/tasks-feature";

import type { PendingRunExecution } from "../pending-run";
import { createVerifyRunFromCompleted } from "./create-verify-run-from-completed";
import { withEvent, workerEventSpec } from "../with-event";

export type QueuedReleaseResult =
  | { kind: "skipped" }
  | { kind: "released"; taskId: string };

export async function applyQueuedReleaseOnRunCompleted(
  tx: DbOrTx,
  message: DeliveryMessage,
  actorId: string | undefined,
): Promise<QueuedReleaseResult> {
  const payload = runCompletedPayloadSchema.parse(message.payload);
  if (payload.status !== "completed") {
    return { kind: "skipped" };
  }

  const completedTask = await findTaskById(tx, payload.taskId);
  if (
    !completedTask ||
    completedTask.stage !== "completed" ||
    !completedTask.repositoryId ||
    !completedTask.branchName
  ) {
    return { kind: "skipped" };
  }

  const queued = await findOldestQueuedTaskForRepoBranch(tx, {
    repositoryId: completedTask.repositoryId,
    branchName: completedTask.branchName,
  });
  if (!queued || !queued.repositoryId || !queued.branchName) {
    return { kind: "skipped" };
  }

  const blocking = await findBlockingTaskForRepoBranch(tx, {
    repositoryId: queued.repositoryId,
    branchName: queued.branchName,
    excludeTaskId: queued.id,
    taskCreatedAt: new Date(queued.createdAt),
  });
  if (blocking) {
    return { kind: "skipped" };
  }

  if (completedTask.worktreePath) {
    const repository = await findRepositoryById(tx, completedTask.repositoryId);
    if (repository?.clonePath) {
      await removeTaskWorktree({
        clonePath: repository.clonePath,
        worktreePath: completedTask.worktreePath,
      });
    }
  }

  const { updated, projection } = await updateTaskStage(tx, {
    taskId: queued.id,
    fromStage: "queued",
    toStage: "worktree_requested",
  });
  if (!updated || !actorId) {
    return { kind: "skipped" };
  }

  await withEvent(tx, {
    actorId,
    run: async () => ({
      events: workerEventSpec({
        aggregate: projection,
        payload: taskStageChangedPayload({
          taskId: projection.id,
          fromStage: "queued",
          toStage: "worktree_requested",
        }),
        factory: createTaskStageChangedEvent,
        occurredAtFrom: "updated",
      }),
    }),
  });

  return { kind: "released", taskId: projection.id };
}

export async function handleRunCompleted(
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<PendingRunExecution | null> {
  return createVerifyRunFromCompleted(tx, input);
}
