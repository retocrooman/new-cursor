import { auditFields } from "@new-cursor/projections";
import { z } from "zod";

export const repositoryProjectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  remoteUrl: z.string(),
  isExternal: z.boolean(),
  ...auditFields,
});

export type RepositoryProjectionDto = z.infer<
  typeof repositoryProjectionSchema
>;

export const repositoryRegisteredEventListItem = z.object({
  aggregateType: z.literal("repository"),
  aggregateId: z.string().uuid(),
  eventType: z.literal("repository_registered"),
  payload: z.object({
    repositoryId: z.string().uuid(),
    name: z.string(),
    remoteUrl: z.string(),
    isExternal: z.boolean(),
  }),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});
