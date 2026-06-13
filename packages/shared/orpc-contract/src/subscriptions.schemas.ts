import { auditFields } from "@new-cursor/projections";
import { z } from "zod";

export const subscriptionProjectionSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  eventTypes: z.array(z.string()),
  ...auditFields,
});

export type SubscriptionProjectionDto = z.infer<
  typeof subscriptionProjectionSchema
>;

export const subscriptionUpsertedEventListItem = z.object({
  aggregateType: z.literal("subscription"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("subscription_upserted"),
  payload: z.object({
    subscriptionId: z.string().uuid(),
    agentId: z.string().uuid(),
    eventTypes: z.array(z.string()),
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});
