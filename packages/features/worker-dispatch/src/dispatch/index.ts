import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";
import { taskStageChangedPayloadSchema } from "@new-cursor/tasks-feature";

import type { PendingRunExecution } from "../pending-run";
import { resolveSubscribers } from "../resolve-subscribers";
import {
  applyQueuedReleaseOnRunCompleted,
  handleRunCompleted,
} from "./run-completed";
import {
  applyTaskCreatedStageTransition,
  handleTaskCreated,
} from "./task-created";
import {
  applyWorktreeRequestedTransition,
  handleTaskStageChanged,
  writeRepositoryCloneCompletedIfNeeded,
} from "./task-stage-changed";
import { handleTaskWorktreeReady } from "./task-worktree-ready";

type DispatchHandler = (
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
) => Promise<PendingRunExecution | null | undefined>;

const DISPATCH_REGISTRY: Partial<Record<string, DispatchHandler>> = {
  task_created: handleTaskCreated,
  task_stage_changed: handleTaskStageChanged,
  task_worktree_ready: handleTaskWorktreeReady,
  run_completed: handleRunCompleted,
};

export type DispatchResult = {
  agentCount: number;
  dispatched: number;
  errors: number;
  pendingRuns: PendingRunExecution[];
};

/**
 * Fan-out failure policy: 1 エージェントの handler 失敗は他エージェントの dispatch を
 * 中断しない。stage 更新は applyTaskCreatedStageTransition / applyWorktreeRequestedTransition
 * で fan-out 前に 1 回だけ。
 */
export async function dispatchToSubscribers(
  tx: DbOrTx,
  message: DeliveryMessage,
): Promise<DispatchResult> {
  const handler = DISPATCH_REGISTRY[message.eventType];
  if (!handler) {
    return { agentCount: 0, dispatched: 0, errors: 0, pendingRuns: [] };
  }

  const agentIds = await resolveSubscribers(tx, message.eventType);
  if (agentIds.length === 0) {
    return { agentCount: 0, dispatched: 0, errors: 0, pendingRuns: [] };
  }

  if (message.eventType === "task_created") {
    const transitioned = await applyTaskCreatedStageTransition(tx, message);
    if (!transitioned) {
      return {
        agentCount: agentIds.length,
        dispatched: 0,
        errors: 0,
        pendingRuns: [],
      };
    }
  }

  let worktreeTransition: Awaited<
    ReturnType<typeof applyWorktreeRequestedTransition>
  > | null = null;
  if (message.eventType === "task_stage_changed") {
    worktreeTransition = await applyWorktreeRequestedTransition(tx, message);
    if (worktreeTransition.kind !== "skipped") {
      if (agentIds[0]) {
        await writeRepositoryCloneCompletedIfNeeded(tx, {
          actorId: agentIds[0],
          transition: worktreeTransition,
        });
      }
    } else {
      const payload = taskStageChangedPayloadSchema.parse(message.payload);
      if (payload.toStage !== "verify") {
        return {
          agentCount: agentIds.length,
          dispatched: 0,
          errors: 0,
          pendingRuns: [],
        };
      }
    }
  }

  if (message.eventType === "run_completed" && agentIds[0]) {
    await applyQueuedReleaseOnRunCompleted(tx, message, agentIds[0]);
  }

  let dispatched = 0;
  let errors = 0;
  const pendingRuns: PendingRunExecution[] = [];
  for (const [index, agentId] of agentIds.entries()) {
    try {
      const pending = await handler(tx, {
        message,
        agentId,
        fanOutIndex: index,
      });
      if (pending) {
        pendingRuns.push(pending);
      }
      dispatched += 1;
    } catch {
      errors += 1;
    }
  }

  return { agentCount: agentIds.length, dispatched, errors, pendingRuns };
}
