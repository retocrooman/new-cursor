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

export type TaskDecisionProjectionDto = z.infer<
  typeof taskDecisionProjectionSchema
>;
