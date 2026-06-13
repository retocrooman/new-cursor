import {
  defineEvent,
  type EventEnvelopeInput,
  eventEnvelopeBase,
} from "@new-cursor/events";
import { z } from "zod";

import { RUN_AGGREGATE } from "./aggregate-types";

export const runStartedPayloadSchema = z.object({
  runId: z.string().uuid(),
  taskId: z.string().uuid(),
  agentId: z.string().uuid(),
  stage: z.string().nullable(),
  summary: z.string().nullable(),
});

export type RunStartedPayload = z.infer<typeof runStartedPayloadSchema>;

export const runStartedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(RUN_AGGREGATE),
  eventType: z.literal("run_started"),
  payload: runStartedPayloadSchema,
});

export type RunStartedEvent = z.infer<typeof runStartedEventSchema>;

export const createRunStartedEvent = defineEvent<RunStartedEvent>(
  RUN_AGGREGATE,
  "run_started",
  runStartedEventSchema,
);

export function runStartedPayload(input: {
  id: string;
  taskId: string;
  agentId: string;
  stage: string | null;
  summary: string | null;
}): RunStartedPayload {
  return {
    runId: input.id,
    taskId: input.taskId,
    agentId: input.agentId,
    stage: input.stage,
    summary: input.summary,
  };
}

export type RunStartedEventInput = EventEnvelopeInput & {
  payload: RunStartedPayload;
};

export const runCompletedPayloadSchema = z.object({
  runId: z.string().uuid(),
  taskId: z.string().uuid(),
  agentId: z.string().uuid(),
  status: z.enum(["completed", "error"]),
  stage: z.string().nullable(),
  summary: z.string().nullable(),
  errorMessage: z.string().nullable(),
  cursorAgentId: z.string().nullable(),
});

export type RunCompletedPayload = z.infer<typeof runCompletedPayloadSchema>;

export const runCompletedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(RUN_AGGREGATE),
  eventType: z.literal("run_completed"),
  payload: runCompletedPayloadSchema,
});

export type RunCompletedEvent = z.infer<typeof runCompletedEventSchema>;

export const createRunCompletedEvent = defineEvent<RunCompletedEvent>(
  RUN_AGGREGATE,
  "run_completed",
  runCompletedEventSchema,
);

export function runCompletedPayload(input: {
  id: string;
  taskId: string;
  agentId: string;
  status: "completed" | "error";
  stage: string | null;
  summary: string | null;
  errorMessage: string | null;
  cursorAgentId: string | null;
}): RunCompletedPayload {
  return {
    runId: input.id,
    taskId: input.taskId,
    agentId: input.agentId,
    status: input.status,
    stage: input.stage,
    summary: input.summary,
    errorMessage: input.errorMessage,
    cursorAgentId: input.cursorAgentId,
  };
}

export type RunCompletedEventInput = EventEnvelopeInput & {
  payload: RunCompletedPayload;
};
