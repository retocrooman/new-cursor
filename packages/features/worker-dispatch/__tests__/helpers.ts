import { randomUUID } from "node:crypto";
import type { DeliveryMessage } from "@new-cursor/events";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import type { TaskProjection } from "@new-cursor/tasks-feature";

export function taskCreatedMessage(
  task: TaskProjection,
  eventId = randomUUID(),
): DeliveryMessage {
  return {
    eventId,
    aggregateType: "task",
    aggregateId: task.id,
    eventType: "task_created",
    payload: {
      taskId: task.id,
      title: task.title,
      branchName: task.branchName,
      repositoryId: task.repositoryId,
      parentTaskId: task.parentTaskId,
    },
    actorId: SYSTEM_ACTOR_ID,
    version: task.version,
    occurredAt: task.createdAt,
  };
}

export function taskStageChangedMessage(
  task: TaskProjection,
  input: {
    fromStage:
      | "created"
      | "worktree_requested"
      | "worktree_ready"
      | "queued"
      | "implementing"
      | "completed";
    toStage:
      | "created"
      | "worktree_requested"
      | "worktree_ready"
      | "queued"
      | "implementing"
      | "completed";
  },
  eventId = randomUUID(),
): DeliveryMessage {
  return {
    eventId,
    aggregateType: "task",
    aggregateId: task.id,
    eventType: "task_stage_changed",
    payload: {
      taskId: task.id,
      fromStage: input.fromStage,
      toStage: input.toStage,
    },
    actorId: SYSTEM_ACTOR_ID,
    version: task.version,
    occurredAt: task.updatedAt,
  };
}

export function taskWorktreeReadyMessage(
  task: TaskProjection,
  input: { worktreePath: string; branchName: string },
  eventId = randomUUID(),
): DeliveryMessage {
  return {
    eventId,
    aggregateType: "task",
    aggregateId: task.id,
    eventType: "task_worktree_ready",
    payload: {
      taskId: task.id,
      worktreePath: input.worktreePath,
      branchName: input.branchName,
    },
    actorId: SYSTEM_ACTOR_ID,
    version: task.version,
    occurredAt: task.updatedAt,
  };
}
