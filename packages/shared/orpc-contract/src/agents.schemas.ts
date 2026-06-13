import { auditFields } from "@new-cursor/projections";
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

export type AgentProjectionDto = z.infer<typeof agentProjectionSchema>;

export const agentCreatedEventListItem = z.object({
  aggregateType: z.literal("agent"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("agent_created"),
  payload: z.object({
    agentId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    labelIds: z.array(z.string().uuid()),
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});
