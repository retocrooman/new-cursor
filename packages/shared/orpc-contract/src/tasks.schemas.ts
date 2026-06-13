import { auditFields } from "@new-cursor/projections";
import { z } from "zod";

export const taskProjectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  branchName: z.string().nullable(),
  repositoryId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  background: z.string().nullable(),
  verificationItems: z.string().nullable(),
  stage: z.enum([
    "created",
    "worktree_requested",
    "worktree_ready",
    "queued",
    "implementing",
    "completed",
  ]),
  worktreePath: z.string().nullable(),
  ...auditFields,
});

export type TaskProjectionDto = z.infer<typeof taskProjectionSchema>;

export const taskCreatedEventListItem = z.object({
  aggregateType: z.literal("task"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("task_created"),
  payload: z.object({
    taskId: z.string().uuid(),
    title: z.string(),
    branchName: z.string().nullable(),
    repositoryId: z.string().uuid().nullable(),
    parentTaskId: z.string().uuid().nullable(),
    background: z.string().nullable().optional(),
    verificationItems: z.string().nullable().optional(),
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});

export type TaskCreatedEventListItem = z.infer<typeof taskCreatedEventListItem>;

const taskStageSchema = z.enum([
  "created",
  "worktree_requested",
  "worktree_ready",
  "queued",
  "implementing",
  "completed",
]);

export const taskStageChangedEventListItem = z.object({
  aggregateType: z.literal("task"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("task_stage_changed"),
  payload: z.object({
    taskId: z.string().uuid(),
    fromStage: taskStageSchema,
    toStage: taskStageSchema,
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});

export type TaskStageChangedEventListItem = z.infer<
  typeof taskStageChangedEventListItem
>;

export const taskWorktreeReadyEventListItem = z.object({
  aggregateType: z.literal("task"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("task_worktree_ready"),
  payload: z.object({
    taskId: z.string().uuid(),
    worktreePath: z.string(),
    branchName: z.string(),
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});

export type TaskWorktreeReadyEventListItem = z.infer<
  typeof taskWorktreeReadyEventListItem
>;

export const taskQueuedEventListItem = z.object({
  aggregateType: z.literal("task"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("task_queued"),
  payload: z.object({
    taskId: z.string().uuid(),
    repositoryId: z.string().uuid(),
    branchName: z.string(),
    blockingTaskId: z.string().uuid(),
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});

export type TaskQueuedEventListItem = z.infer<typeof taskQueuedEventListItem>;
