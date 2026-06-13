import {
  defineEvent,
  type EventEnvelopeInput,
  eventEnvelopeBase,
} from "@new-cursor/events";
import { z } from "zod";

import { SUBSCRIPTION_AGGREGATE } from "./aggregate-types";

export const subscriptionUpsertedPayloadSchema = z.object({
  subscriptionId: z.string().uuid(),
  agentId: z.string().uuid(),
  eventTypes: z.array(z.string()),
});

export type SubscriptionUpsertedPayload = z.infer<
  typeof subscriptionUpsertedPayloadSchema
>;

export const subscriptionUpsertedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(SUBSCRIPTION_AGGREGATE),
  eventType: z.literal("subscription_upserted"),
  payload: subscriptionUpsertedPayloadSchema,
});

export type SubscriptionUpsertedEvent = z.infer<
  typeof subscriptionUpsertedEventSchema
>;

export const createSubscriptionUpsertedEvent =
  defineEvent<SubscriptionUpsertedEvent>(
    SUBSCRIPTION_AGGREGATE,
    "subscription_upserted",
    subscriptionUpsertedEventSchema,
  );

export function subscriptionUpsertedPayload(input: {
  id: string;
  agentId: string;
  eventTypes: string[];
}): SubscriptionUpsertedPayload {
  return {
    subscriptionId: input.id,
    agentId: input.agentId,
    eventTypes: input.eventTypes,
  };
}

export type SubscriptionUpsertedEventInput = EventEnvelopeInput & {
  payload: SubscriptionUpsertedPayload;
};
