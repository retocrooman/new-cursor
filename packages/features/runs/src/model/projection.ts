import { auditFields, toAuditFields } from "@new-cursor/projections";
import { z } from "zod";

export const runProjectionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  agentId: z.string().uuid(),
  cursorAgentId: z.string().nullable(),
  status: z.enum(["running", "completed", "error"]),
  stage: z.string().nullable(),
  summary: z.string().nullable(),
  errorMessage: z.string().nullable(),
  ...auditFields,
});

export type RunProjection = z.infer<typeof runProjectionSchema>;

export type RunRow = {
  id: string;
  taskId: string;
  agentId: string;
  cursorAgentId: string | null;
  status: string;
  stage: string | null;
  summary: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
};

export function toRunProjection(row: RunRow): RunProjection {
  return runProjectionSchema.parse({
    id: row.id,
    taskId: row.taskId,
    agentId: row.agentId,
    cursorAgentId: row.cursorAgentId,
    status: row.status,
    stage: row.stage,
    summary: row.summary,
    errorMessage: row.errorMessage,
    ...toAuditFields(row),
  });
}
