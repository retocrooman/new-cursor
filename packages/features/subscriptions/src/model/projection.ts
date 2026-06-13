import { auditFields, toAuditFields } from "@new-cursor/projections";
import { z } from "zod";

export const subscriptionProjectionSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  eventTypes: z.array(z.string()),
  ...auditFields,
});

export type SubscriptionProjection = z.infer<
  typeof subscriptionProjectionSchema
>;

export type SubscriptionRow = {
  id: string;
  agentId: string;
  eventTypes: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
};

export function toSubscriptionProjection(
  row: SubscriptionRow,
): SubscriptionProjection {
  return subscriptionProjectionSchema.parse({
    id: row.id,
    agentId: row.agentId,
    eventTypes: row.eventTypes,
    ...toAuditFields(row),
  });
}
