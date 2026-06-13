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
  background: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  verificationItems: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
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
  background?: string | null;
  verificationItems?: string | null;
}): TaskCreatedPayload {
  return {
    taskId: input.id,
    title: input.title,
    branchName: input.branchName,
    repositoryId: input.repositoryId,
    parentTaskId: input.parentTaskId,
    background: input.background ?? null,
    verificationItems: input.verificationItems ?? null,
  };
}

export type TaskCreatedEventInput = EventEnvelopeInput & {
  payload: TaskCreatedPayload;
};

export const TASK_STAGE_VALUES = [
  "created",
  "worktree_requested",
  "worktree_ready",
  "queued",
  "implementing",
  "completed",
] as const;

export const taskStageChangedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  fromStage: z.enum(TASK_STAGE_VALUES),
  toStage: z.enum(TASK_STAGE_VALUES),
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

export const taskWorktreeReadyPayloadSchema = z.object({
  taskId: z.string().uuid(),
  worktreePath: z.string(),
  branchName: z.string(),
});

export type TaskWorktreeReadyPayload = z.infer<
  typeof taskWorktreeReadyPayloadSchema
>;

export const taskWorktreeReadyEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_worktree_ready"),
  payload: taskWorktreeReadyPayloadSchema,
});

export type TaskWorktreeReadyEvent = z.infer<
  typeof taskWorktreeReadyEventSchema
>;

export const createTaskWorktreeReadyEvent = defineEvent<TaskWorktreeReadyEvent>(
  TASK_AGGREGATE,
  "task_worktree_ready",
  taskWorktreeReadyEventSchema,
);

export function taskWorktreeReadyPayload(input: {
  taskId: string;
  worktreePath: string;
  branchName: string;
}): TaskWorktreeReadyPayload {
  return {
    taskId: input.taskId,
    worktreePath: input.worktreePath,
    branchName: input.branchName,
  };
}

export const taskQueuedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  repositoryId: z.string().uuid(),
  branchName: z.string(),
  blockingTaskId: z.string().uuid(),
});

export type TaskQueuedPayload = z.infer<typeof taskQueuedPayloadSchema>;

export const taskQueuedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_queued"),
  payload: taskQueuedPayloadSchema,
});

export type TaskQueuedEvent = z.infer<typeof taskQueuedEventSchema>;

export const createTaskQueuedEvent = defineEvent<TaskQueuedEvent>(
  TASK_AGGREGATE,
  "task_queued",
  taskQueuedEventSchema,
);

export function taskQueuedPayload(input: {
  taskId: string;
  repositoryId: string;
  branchName: string;
  blockingTaskId: string;
}): TaskQueuedPayload {
  return {
    taskId: input.taskId,
    repositoryId: input.repositoryId,
    branchName: input.branchName,
    blockingTaskId: input.blockingTaskId,
  };
}
