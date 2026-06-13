import { auditFields, toAuditFields } from "@new-cursor/projections";
import { z } from "zod";

export const ruleProjectionSchema = z.object({
  id: z.string().uuid(),
  labelId: z.string().uuid(),
  content: z.string(),
  ...auditFields,
});

export type RuleProjection = z.infer<typeof ruleProjectionSchema>;

export type RuleRow = {
  id: string;
  labelId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
};

export function toRuleProjection(row: RuleRow): RuleProjection {
  return ruleProjectionSchema.parse({
    id: row.id,
    labelId: row.labelId,
    content: row.content,
    ...toAuditFields(row),
  });
}
