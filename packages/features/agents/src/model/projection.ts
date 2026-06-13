import { auditFields, toAuditFields } from "@new-cursor/projections";
import { z } from "zod";

export const agentProjectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  labels: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
  ),
  ...auditFields,
});

export type AgentProjection = z.infer<typeof agentProjectionSchema>;

export type AgentRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
};

export function toAgentProjection(
  row: AgentRow,
  labels: Array<{ id: string; name: string }>,
): AgentProjection {
  return agentProjectionSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    labels,
    ...toAuditFields(row),
  });
}
