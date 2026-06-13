import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";
import {
  createTaskWorktree,
  ensureRepositoryClone,
  type GitOpsRoots,
  gitOpsRootsFromEnv,
} from "@new-cursor/git-ops";
import {
  createRepositoryCloneCompletedEvent,
  findRepositoryById,
  repositoryCloneCompletedPayload,
  updateRepositoryClonePath,
} from "@new-cursor/repositories-feature";
import {
  completeWorktreeReady,
  createTaskQueuedEvent,
  createTaskWorktreeReadyEvent,
  findBlockingTaskForRepoBranch,
  findTaskById,
  TaskFeatureError,
  taskQueuedPayload,
  taskStageChangedPayloadSchema,
  taskWorktreeReadyPayload,
  updateTaskStage,
} from "@new-cursor/tasks-feature";

import { withEvent, workerEventSpec } from "../with-event";

export type WorktreeTransitionResult =
  | { kind: "skipped" }
  | { kind: "queued"; taskId: string; blockingTaskId: string }
  | {
      kind: "ready";
      taskId: string;
      worktreePath: string;
      branchName: string;
      repositoryId: string;
      clonePath: string;
      cloned: boolean;
    };

let rootsOverride: GitOpsRoots | undefined;

export function setGitOpsRootsForTests(roots: GitOpsRoots | undefined): void {
  rootsOverride = roots;
}

function resolveRoots(): GitOpsRoots {
  return rootsOverride ?? gitOpsRootsFromEnv();
}

export async function applyWorktreeRequestedTransition(
  tx: DbOrTx,
  message: DeliveryMessage,
): Promise<WorktreeTransitionResult> {
  const payload = taskStageChangedPayloadSchema.parse(message.payload);
  if (payload.toStage !== "worktree_requested") {
    return { kind: "skipped" };
  }

  const projection = await findTaskById(tx, payload.taskId);
  if (!projection || projection.stage !== "worktree_requested") {
    return { kind: "skipped" };
  }

  if (!projection.repositoryId || !projection.branchName) {
    throw TaskFeatureError.invalidTransition(
      projection.id,
      projection.stage,
      "worktree_ready",
      ["worktree_requested with repositoryId and branchName"],
    );
  }

  const blocking = await findBlockingTaskForRepoBranch(tx, {
    repositoryId: projection.repositoryId,
    branchName: projection.branchName,
    excludeTaskId: projection.id,
    taskCreatedAt: new Date(projection.createdAt),
  });
  if (blocking) {
    await updateTaskStage(tx, {
      taskId: projection.id,
      fromStage: "worktree_requested",
      toStage: "queued",
    });
    return {
      kind: "queued",
      taskId: projection.id,
      blockingTaskId: blocking.id,
    };
  }

  const repository = await findRepositoryById(tx, projection.repositoryId);
  if (!repository) {
    throw TaskFeatureError.notFound(projection.repositoryId);
  }

  const roots = resolveRoots();
  const { clonePath, cloned } = await ensureRepositoryClone({
    cloneRoot: roots.cloneRoot,
    repositoryId: repository.id,
    remoteUrl: repository.remoteUrl,
    existingClonePath: repository.clonePath,
  });

  if (cloned || repository.clonePath !== clonePath) {
    await updateRepositoryClonePath(tx, {
      repositoryId: repository.id,
      clonePath,
    });
  }

  const { worktreePath } = await createTaskWorktree({
    worktreeRoot: roots.worktreeRoot,
    clonePath,
    taskId: projection.id,
    branchName: projection.branchName,
    baseBranch: roots.defaultBaseBranch,
  });

  await completeWorktreeReady(tx, {
    taskId: projection.id,
    worktreePath,
  });

  return {
    kind: "ready",
    taskId: projection.id,
    worktreePath,
    branchName: projection.branchName,
    repositoryId: repository.id,
    clonePath,
    cloned,
  };
}

export async function handleTaskStageChanged(
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<null> {
  const payload = taskStageChangedPayloadSchema.parse(input.message.payload);
  if (payload.toStage !== "worktree_requested") {
    return null;
  }

  const projection = await findTaskById(tx, payload.taskId);
  if (!projection) {
    throw TaskFeatureError.notFound(payload.taskId);
  }

  if (projection.stage === "queued") {
    const blocking = projection.repositoryId
      ? await findBlockingTaskForRepoBranch(tx, {
          repositoryId: projection.repositoryId,
          branchName: projection.branchName ?? "",
          excludeTaskId: projection.id,
          taskCreatedAt: new Date(projection.createdAt),
        })
      : null;
    if (!blocking || !projection.repositoryId || !projection.branchName) {
      return null;
    }

    const repositoryId = projection.repositoryId;
    const branchName = projection.branchName;

    await withEvent(tx, {
      actorId: input.agentId,
      run: async () => ({
        events: workerEventSpec({
          aggregate: {
            ...projection,
            version: projection.version + input.fanOutIndex,
          },
          payload: taskQueuedPayload({
            taskId: projection.id,
            repositoryId,
            branchName,
            blockingTaskId: blocking.id,
          }),
          factory: createTaskQueuedEvent,
          occurredAtFrom: "updated",
        }),
      }),
    });
    return null;
  }

  if (projection.stage !== "worktree_ready" || !projection.worktreePath) {
    return null;
  }

  const branchName = projection.branchName;
  if (!branchName) {
    return null;
  }

  await withEvent(tx, {
    actorId: input.agentId,
    run: async () => ({
      events: workerEventSpec({
        aggregate: {
          ...projection,
          version: projection.version + input.fanOutIndex,
        },
        payload: taskWorktreeReadyPayload({
          taskId: projection.id,
          worktreePath: projection.worktreePath ?? "",
          branchName,
        }),
        factory: createTaskWorktreeReadyEvent,
        occurredAtFrom: "updated",
      }),
    }),
  });
  return null;
}

export async function writeRepositoryCloneCompletedIfNeeded(
  tx: DbOrTx,
  input: {
    actorId: string;
    transition: WorktreeTransitionResult;
  },
): Promise<void> {
  if (input.transition.kind !== "ready" || !input.transition.cloned) {
    return;
  }

  const { repositoryId, clonePath } = input.transition;
  const repository = await findRepositoryById(tx, repositoryId);
  if (!repository) {
    return;
  }

  await withEvent(tx, {
    actorId: input.actorId,
    run: async () => ({
      events: workerEventSpec({
        aggregate: repository,
        payload: repositoryCloneCompletedPayload({
          repositoryId: repository.id,
          clonePath,
        }),
        factory: createRepositoryCloneCompletedEvent,
        occurredAtFrom: "updated",
      }),
    }),
  });
}
