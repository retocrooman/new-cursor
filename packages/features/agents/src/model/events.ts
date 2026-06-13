import {
  defineEvent,
  type EventEnvelopeInput,
  eventEnvelopeBase,
} from "@new-cursor/events";
import { z } from "zod";

import { AGENT_AGGREGATE } from "./aggregate-types";

export const agentCreatedPayloadSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  labelIds: z.array(z.string().uuid()),
});

export type AgentCreatedPayload = z.infer<typeof agentCreatedPayloadSchema>;

export const agentCreatedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(AGENT_AGGREGATE),
  eventType: z.literal("agent_created"),
  payload: agentCreatedPayloadSchema,
});

export type AgentCreatedEvent = z.infer<typeof agentCreatedEventSchema>;

export const createAgentCreatedEvent = defineEvent<AgentCreatedEvent>(
  AGENT_AGGREGATE,
  "agent_created",
  agentCreatedEventSchema,
);

export function agentCreatedPayload(input: {
  id: string;
  name: string;
  description: string | null;
  labelIds: string[];
}): AgentCreatedPayload {
  return {
    agentId: input.id,
    name: input.name,
    description: input.description,
    labelIds: input.labelIds,
  };
}

export type AgentCreatedEventInput = EventEnvelopeInput & {
  payload: AgentCreatedPayload;
};
