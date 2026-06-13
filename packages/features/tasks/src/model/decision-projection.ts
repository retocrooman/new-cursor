import { z } from "zod";

export const taskDecisionProjectionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  summary: z.string(),
  context: z.string().nullable(),
  userResponse: z.string().nullable(),
  agentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export type TaskDecisionProjection = z.infer<
  typeof taskDecisionProjectionSchema
>;

export type TaskDecisionRow = {
  id: string;
  taskId: string;
  summary: string;
  context: string | null;
  userResponse: string | null;
  agentId: string | null;
  createdAt: Date;
};

export function toTaskDecisionProjection(
  row: TaskDecisionRow,
): TaskDecisionProjection {
  return taskDecisionProjectionSchema.parse({
    id: row.id,
    taskId: row.taskId,
    summary: row.summary,
    context: row.context,
    userResponse: row.userResponse,
    agentId: row.agentId,
    createdAt: row.createdAt.toISOString(),
  });
}
