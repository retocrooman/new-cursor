import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";
import {
  approvalRequestedPayload,
  buildStubPullRequestUrl,
  createApprovalRequestedEvent,
  createTaskPrCreatedEvent,
  createTaskPrRequestedEvent,
  createTaskStageChangedEvent,
  createTaskWaitingEvent,
  findTaskById,
  TaskFeatureError,
  taskPrCreatedPayload,
  taskPrCreatedPayloadSchema,
  taskPrRequestedPayload,
  taskPrRequestedPayloadSchema,
  taskStageChangedPayload,
  taskStageChangedPayloadSchema,
  taskWaitingPayload,
  updateTaskPullRequestUrl,
  updateTaskStage,
} from "@new-cursor/tasks-feature";

import { withEvent, workerEventSpec } from "../with-event";

export async function handleTaskStageChangedToVerifying(
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<null> {
  const payload = taskStageChangedPayloadSchema.parse(input.message.payload);
  if (payload.toStage !== "verifying") {
    return null;
  }

  const projection = await findTaskById(tx, payload.taskId);
  if (!projection || projection.stage !== "verifying") {
    return null;
  }

  if (!projection.repositoryId || !projection.branchName) {
    throw TaskFeatureError.invalidTransition(
      projection.id,
      projection.stage,
      "task_pr_requested",
      ["verifying with repositoryId and branchName"],
    );
  }

  const repositoryId = projection.repositoryId;
  const branchName = projection.branchName;

  await withEvent(tx, {
    actorId: input.agentId,
    run: async () => ({
      events: workerEventSpec({
        aggregate: {
          ...projection,
          version: input.message.version + 1 + input.fanOutIndex,
        },
        payload: taskPrRequestedPayload({
          taskId: projection.id,
          repositoryId,
          branchName,
        }),
        factory: createTaskPrRequestedEvent,
        occurredAtFrom: "updated",
      }),
    }),
  });

  return null;
}

export async function handleTaskPrRequested(
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<null> {
  const payload = taskPrRequestedPayloadSchema.parse(input.message.payload);
  const projection = await findTaskById(tx, payload.taskId);
  if (!projection || projection.stage !== "verifying") {
    return null;
  }

  const pullRequestUrl = buildStubPullRequestUrl(payload.repositoryId);

  await withEvent(tx, {
    actorId: input.agentId,
    run: async () => ({
      events: workerEventSpec({
        aggregate: {
          ...projection,
          version: input.message.version + 1 + input.fanOutIndex,
        },
        payload: taskPrCreatedPayload({
          taskId: projection.id,
          pullRequestUrl,
        }),
        factory: createTaskPrCreatedEvent,
        occurredAtFrom: "updated",
      }),
    }),
  });

  return null;
}

export async function handleTaskPrCreated(
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<null> {
  const payload = taskPrCreatedPayloadSchema.parse(input.message.payload);
  const projection = await findTaskById(tx, payload.taskId);
  if (!projection || projection.stage !== "verifying") {
    return null;
  }

  const withUrl = await updateTaskPullRequestUrl(tx, {
    taskId: projection.id,
    pullRequestUrl: payload.pullRequestUrl,
  });

  const { updated, projection: waitingTask } = await updateTaskStage(tx, {
    taskId: projection.id,
    fromStage: "verifying",
    toStage: "waiting",
  });
  if (!updated) {
    return null;
  }

  const baseVersion = input.message.version + 1 + input.fanOutIndex;
  await withEvent(tx, {
    actorId: input.agentId,
    run: async () => ({
      events: [
        workerEventSpec({
          aggregate: {
            ...waitingTask,
            version: baseVersion,
          },
          payload: taskStageChangedPayload({
            taskId: waitingTask.id,
            fromStage: "verifying",
            toStage: "waiting",
          }),
          factory: createTaskStageChangedEvent,
          occurredAtFrom: "updated",
        }),
        workerEventSpec({
          aggregate: {
            ...waitingTask,
            version: baseVersion + 1,
          },
          payload: taskWaitingPayload({ taskId: waitingTask.id }),
          factory: createTaskWaitingEvent,
          occurredAtFrom: "updated",
        }),
        workerEventSpec({
          aggregate: {
            ...withUrl,
            version: baseVersion + 2,
          },
          payload: approvalRequestedPayload({
            taskId: waitingTask.id,
            pullRequestUrl: payload.pullRequestUrl,
          }),
          factory: createApprovalRequestedEvent,
          occurredAtFrom: "updated",
        }),
      ],
    }),
  });

  return null;
}
