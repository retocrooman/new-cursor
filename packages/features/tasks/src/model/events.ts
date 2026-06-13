import {
  defineEvent,
  type EventEnvelopeInput,
  eventEnvelopeBase,
} from "@new-cursor/events";
import { z } from "zod";

import { TASK_AGGREGATE } from "./aggregate-types";

export const taskCreatedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string(),
  branchName: z.string().nullable(),
  repositoryId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
});

export type TaskCreatedPayload = z.infer<typeof taskCreatedPayloadSchema>;

export const taskCreatedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_created"),
  payload: taskCreatedPayloadSchema,
});

export type TaskCreatedEvent = z.infer<typeof taskCreatedEventSchema>;

export const createTaskCreatedEvent = defineEvent<TaskCreatedEvent>(
  TASK_AGGREGATE,
  "task_created",
  taskCreatedEventSchema,
);

export function taskCreatedPayload(input: {
  id: string;
  title: string;
  branchName: string | null;
  repositoryId: string | null;
  parentTaskId: string | null;
}): TaskCreatedPayload {
  return {
    taskId: input.id,
    title: input.title,
    branchName: input.branchName,
    repositoryId: input.repositoryId,
    parentTaskId: input.parentTaskId,
  };
}

export type TaskCreatedEventInput = EventEnvelopeInput & {
  payload: TaskCreatedPayload;
};

export const taskStageChangedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  fromStage: z.enum(["created", "worktree_requested"]),
  toStage: z.enum(["created", "worktree_requested"]),
});

export type TaskStageChangedPayload = z.infer<
  typeof taskStageChangedPayloadSchema
>;

export const taskStageChangedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_stage_changed"),
  payload: taskStageChangedPayloadSchema,
});

export type TaskStageChangedEvent = z.infer<typeof taskStageChangedEventSchema>;

export const createTaskStageChangedEvent = defineEvent<TaskStageChangedEvent>(
  TASK_AGGREGATE,
  "task_stage_changed",
  taskStageChangedEventSchema,
);

export function taskStageChangedPayload(input: {
  taskId: string;
  fromStage: TaskStageChangedPayload["fromStage"];
  toStage: TaskStageChangedPayload["toStage"];
}): TaskStageChangedPayload {
  return {
    taskId: input.taskId,
    fromStage: input.fromStage,
    toStage: input.toStage,
  };
}
