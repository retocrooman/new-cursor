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
  "verifying",
  "waiting",
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

export const taskPrRequestedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  repositoryId: z.string().uuid(),
  branchName: z.string(),
});

export type TaskPrRequestedPayload = z.infer<
  typeof taskPrRequestedPayloadSchema
>;

export const taskPrRequestedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_pr_requested"),
  payload: taskPrRequestedPayloadSchema,
});

export type TaskPrRequestedEvent = z.infer<typeof taskPrRequestedEventSchema>;

export const createTaskPrRequestedEvent = defineEvent<TaskPrRequestedEvent>(
  TASK_AGGREGATE,
  "task_pr_requested",
  taskPrRequestedEventSchema,
);

export function taskPrRequestedPayload(input: {
  taskId: string;
  repositoryId: string;
  branchName: string;
}): TaskPrRequestedPayload {
  return {
    taskId: input.taskId,
    repositoryId: input.repositoryId,
    branchName: input.branchName,
  };
}

export const taskPrCreatedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  pullRequestUrl: z.string().url(),
});

export type TaskPrCreatedPayload = z.infer<typeof taskPrCreatedPayloadSchema>;

export const taskPrCreatedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_pr_created"),
  payload: taskPrCreatedPayloadSchema,
});

export type TaskPrCreatedEvent = z.infer<typeof taskPrCreatedEventSchema>;

export const createTaskPrCreatedEvent = defineEvent<TaskPrCreatedEvent>(
  TASK_AGGREGATE,
  "task_pr_created",
  taskPrCreatedEventSchema,
);

export function taskPrCreatedPayload(input: {
  taskId: string;
  pullRequestUrl: string;
}): TaskPrCreatedPayload {
  return {
    taskId: input.taskId,
    pullRequestUrl: input.pullRequestUrl,
  };
}

export const approvalRequestedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  pullRequestUrl: z.string().url(),
});

export type ApprovalRequestedPayload = z.infer<
  typeof approvalRequestedPayloadSchema
>;

export const approvalRequestedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("approval_requested"),
  payload: approvalRequestedPayloadSchema,
});

export type ApprovalRequestedEvent = z.infer<
  typeof approvalRequestedEventSchema
>;

export const createApprovalRequestedEvent = defineEvent<ApprovalRequestedEvent>(
  TASK_AGGREGATE,
  "approval_requested",
  approvalRequestedEventSchema,
);

export function approvalRequestedPayload(input: {
  taskId: string;
  pullRequestUrl: string;
}): ApprovalRequestedPayload {
  return {
    taskId: input.taskId,
    pullRequestUrl: input.pullRequestUrl,
  };
}

export const approvalGrantedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  approvedBy: z.string().uuid(),
  pullRequestUrl: z.string().url(),
});

export type ApprovalGrantedPayload = z.infer<
  typeof approvalGrantedPayloadSchema
>;

export const approvalGrantedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("approval_granted"),
  payload: approvalGrantedPayloadSchema,
});

export type ApprovalGrantedEvent = z.infer<typeof approvalGrantedEventSchema>;

export const createApprovalGrantedEvent = defineEvent<ApprovalGrantedEvent>(
  TASK_AGGREGATE,
  "approval_granted",
  approvalGrantedEventSchema,
);

export function approvalGrantedPayload(input: {
  taskId: string;
  approvedBy: string;
  pullRequestUrl: string;
}): ApprovalGrantedPayload {
  return {
    taskId: input.taskId,
    approvedBy: input.approvedBy,
    pullRequestUrl: input.pullRequestUrl,
  };
}

export const taskWaitingPayloadSchema = z.object({
  taskId: z.string().uuid(),
  waitingFor: z.literal("approval"),
});

export type TaskWaitingPayload = z.infer<typeof taskWaitingPayloadSchema>;

export const taskWaitingEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_waiting"),
  payload: taskWaitingPayloadSchema,
});

export type TaskWaitingEvent = z.infer<typeof taskWaitingEventSchema>;

export const createTaskWaitingEvent = defineEvent<TaskWaitingEvent>(
  TASK_AGGREGATE,
  "task_waiting",
  taskWaitingEventSchema,
);

export function taskWaitingPayload(input: {
  taskId: string;
  waitingFor?: "approval";
}): TaskWaitingPayload {
  return {
    taskId: input.taskId,
    waitingFor: input.waitingFor ?? "approval",
  };
}

export const taskResumedPayloadSchema = z.object({
  taskId: z.string().uuid(),
  resumeReason: z.literal("approval_granted"),
});

export type TaskResumedPayload = z.infer<typeof taskResumedPayloadSchema>;

export const taskResumedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_resumed"),
  payload: taskResumedPayloadSchema,
});

export type TaskResumedEvent = z.infer<typeof taskResumedEventSchema>;

export const createTaskResumedEvent = defineEvent<TaskResumedEvent>(
  TASK_AGGREGATE,
  "task_resumed",
  taskResumedEventSchema,
);

export function taskResumedPayload(input: {
  taskId: string;
  resumeReason?: "approval_granted";
}): TaskResumedPayload {
  return {
    taskId: input.taskId,
    resumeReason: input.resumeReason ?? "approval_granted",
  };
}

export const taskCompletedPayloadSchema = z.object({
  taskId: z.string().uuid(),
});

export type TaskCompletedPayload = z.infer<typeof taskCompletedPayloadSchema>;

export const taskCompletedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(TASK_AGGREGATE),
  eventType: z.literal("task_completed"),
  payload: taskCompletedPayloadSchema,
});

export type TaskCompletedEvent = z.infer<typeof taskCompletedEventSchema>;

export const createTaskCompletedEvent = defineEvent<TaskCompletedEvent>(
  TASK_AGGREGATE,
  "task_completed",
  taskCompletedEventSchema,
);

export function taskCompletedPayload(input: {
  taskId: string;
}): TaskCompletedPayload {
  return {
    taskId: input.taskId,
  };
}
