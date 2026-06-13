import { auditFields } from "@new-cursor/projections";
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

export type RunProjectionDto = z.infer<typeof runProjectionSchema>;

export const runStartedEventListItem = z.object({
  aggregateType: z.literal("run"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("run_started"),
  payload: z.object({
    runId: z.string().uuid(),
    taskId: z.string().uuid(),
    agentId: z.string().uuid(),
    stage: z.string().nullable(),
    summary: z.string().nullable(),
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});
