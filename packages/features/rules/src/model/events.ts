import {
  defineEvent,
  type EventEnvelopeInput,
  eventEnvelopeBase,
} from "@new-cursor/events";
import { z } from "zod";

import { RULE_AGGREGATE } from "./aggregate-types";

export const ruleCreatedPayloadSchema = z.object({
  ruleId: z.string().uuid(),
  labelId: z.string().uuid(),
  content: z.string(),
});

export type RuleCreatedPayload = z.infer<typeof ruleCreatedPayloadSchema>;

export const ruleCreatedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(RULE_AGGREGATE),
  eventType: z.literal("rule_created"),
  payload: ruleCreatedPayloadSchema,
});

export type RuleCreatedEvent = z.infer<typeof ruleCreatedEventSchema>;

export const createRuleCreatedEvent = defineEvent<RuleCreatedEvent>(
  RULE_AGGREGATE,
  "rule_created",
  ruleCreatedEventSchema,
);

export function ruleCreatedPayload(input: {
  id: string;
  labelId: string;
  content: string;
}): RuleCreatedPayload {
  return {
    ruleId: input.id,
    labelId: input.labelId,
    content: input.content,
  };
}

export type RuleCreatedEventInput = EventEnvelopeInput & {
  payload: RuleCreatedPayload;
};
