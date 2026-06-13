import { auditFields } from "@new-cursor/projections";
import { z } from "zod";

export const taskProjectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  branchName: z.string().nullable(),
  repositoryId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  stage: z.enum(["created"]),
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
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});

export type TaskCreatedEventListItem = z.infer<typeof taskCreatedEventListItem>;
