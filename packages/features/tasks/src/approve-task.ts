import type { DbOrTx } from "@new-cursor/db";
import { and, eq, events, sql } from "@new-cursor/db";
import type { AppendableEvent } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";

import {
  approvalGrantedPayload,
  createApprovalGrantedEvent,
  createTaskCompletedEvent,
  createTaskResumedEvent,
  createTaskStageChangedEvent,
  taskCompletedPayload,
  taskResumedPayload,
  taskStageChangedPayload,
} from "./model/events";
import {
  findTaskById,
  TaskFeatureError,
  updateTaskStage,
} from "./repository/tasks";

type ApproveTaskEvent = {
  aggregate: {
    id: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
  appendable: AppendableEvent;
};

async function appendTaskEvent(
  tx: DbOrTx,
  aggregate: ApproveTaskEvent["aggregate"],
  appendable: AppendableEvent,
): Promise<ApproveTaskEvent> {
  const { eventId } = await appendEvent(tx, appendable);
  await writeOutbox(tx, { ...appendable, eventId });
  return { aggregate, appendable };
}

export async function approveTask(
  tx: DbOrTx,
  input: { taskId: string; approvedBy: string },
): Promise<{
  projection: Awaited<ReturnType<typeof findTaskById>> & object;
  events: ApproveTaskEvent[];
}> {
  const existing = await findTaskById(tx, input.taskId);
  if (!existing) {
    throw TaskFeatureError.notFound(input.taskId);
  }
  if (existing.stage !== "waiting") {
    throw TaskFeatureError.invalidTransition(
      existing.id,
      existing.stage,
      "completed",
      ["waiting"],
    );
  }

  const pullRequestUrl = existing.pullRequestUrl;
  if (!pullRequestUrl) {
    throw TaskFeatureError.invalidTransition(
      existing.id,
      existing.stage,
      "completed",
      ["waiting with pullRequestUrl"],
    );
  }

  const { updated, projection: completedTask } = await updateTaskStage(tx, {
    taskId: existing.id,
    fromStage: "waiting",
    toStage: "completed",
  });
  if (!updated) {
    throw TaskFeatureError.invalidTransition(
      existing.id,
      existing.stage,
      "completed",
      ["waiting"],
    );
  }

  const [versionRow] = await tx
    .select({
      maxVersion: sql<number>`coalesce(max(${events.version}), 0)`.mapWith(
        Number,
      ),
    })
    .from(events)
    .where(
      and(
        eq(events.aggregateType, "task"),
        eq(events.aggregateId, completedTask.id),
      ),
    );
  const nextVersion = (versionRow?.maxVersion ?? 0) + 1;

  const envelope = {
    aggregateId: completedTask.id,
    actorId: input.approvedBy,
    occurredAt: completedTask.updatedAt,
  };

  const appendedEvents = [
    await appendTaskEvent(
      tx,
      completedTask,
      createApprovalGrantedEvent({
        ...envelope,
        version: nextVersion,
        payload: approvalGrantedPayload({
          taskId: completedTask.id,
          approvedBy: input.approvedBy,
          pullRequestUrl,
        }),
      }),
    ),
    await appendTaskEvent(
      tx,
      completedTask,
      createTaskResumedEvent({
        ...envelope,
        version: nextVersion + 1,
        payload: taskResumedPayload({ taskId: completedTask.id }),
      }),
    ),
    await appendTaskEvent(
      tx,
      completedTask,
      createTaskStageChangedEvent({
        ...envelope,
        version: nextVersion + 2,
        payload: taskStageChangedPayload({
          taskId: completedTask.id,
          fromStage: "waiting",
          toStage: "completed",
        }),
      }),
    ),
    await appendTaskEvent(
      tx,
      completedTask,
      createTaskCompletedEvent({
        ...envelope,
        version: nextVersion + 3,
        payload: taskCompletedPayload({ taskId: completedTask.id }),
      }),
    ),
  ];

  return { projection: completedTask, events: appendedEvents };
}
