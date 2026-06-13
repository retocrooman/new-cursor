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
