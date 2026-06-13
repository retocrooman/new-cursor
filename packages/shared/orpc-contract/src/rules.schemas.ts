import { auditFields } from "@new-cursor/projections";
import { z } from "zod";

export const ruleProjectionSchema = z.object({
  id: z.string().uuid(),
  labelId: z.string().uuid(),
  content: z.string(),
  ...auditFields,
});

export type RuleProjectionDto = z.infer<typeof ruleProjectionSchema>;

export const ruleCreatedEventListItem = z.object({
  aggregateType: z.literal("rule"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("rule_created"),
  payload: z.object({
    ruleId: z.string().uuid(),
    labelId: z.string().uuid(),
    content: z.string(),
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});
