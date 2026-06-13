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
