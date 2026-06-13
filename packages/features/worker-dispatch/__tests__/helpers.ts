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
