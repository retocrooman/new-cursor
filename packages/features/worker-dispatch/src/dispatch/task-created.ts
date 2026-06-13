import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";
import {
  createTaskStageChangedEvent,
  findTaskById,
  TaskFeatureError,
  taskCreatedPayloadSchema,
  taskStageChangedPayload,
  updateTaskStage,
} from "@new-cursor/tasks-feature";

import { withEvent, workerEventSpec } from "../with-event";

export async function applyTaskCreatedStageTransition(
  tx: DbOrTx,
  message: DeliveryMessage,
): Promise<boolean> {
  const payload = taskCreatedPayloadSchema.parse(message.payload);
  const { updated } = await updateTaskStage(tx, {
    taskId: payload.taskId,
    fromStage: "created",
    toStage: "worktree_requested",
  });
  return updated;
}

export async function handleTaskCreated(
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<null> {
  const payload = taskCreatedPayloadSchema.parse(input.message.payload);
  const projection = await findTaskById(tx, payload.taskId);
  if (!projection) {
    throw TaskFeatureError.notFound(payload.taskId);
  }

  if (projection.stage !== "worktree_requested") {
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
        payload: taskStageChangedPayload({
          taskId: projection.id,
          fromStage: "created",
          toStage: "worktree_requested",
        }),
        factory: createTaskStageChangedEvent,
        occurredAtFrom: "updated",
      }),
    }),
  });
  return null;
}
