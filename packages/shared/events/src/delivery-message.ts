import { z } from "zod";

/** relay → SQS → worker で運ぶ配送メッセージ。 */
export const deliveryMessageSchema = z.object({
  eventId: z.string().uuid(),
  aggregateType: z.string(),
  aggregateId: z.string().uuid(),
  eventType: z.string(),
  payload: z.unknown(),
  actorId: z.string().uuid(),
  version: z.number().int().positive(),
  occurredAt: z.string().datetime(),
});

export type DeliveryMessage = z.infer<typeof deliveryMessageSchema>;

export function toDeliveryMessage(row: DeliveryMessage): DeliveryMessage {
  return deliveryMessageSchema.parse(row);
}
