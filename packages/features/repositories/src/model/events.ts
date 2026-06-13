import {
  defineEvent,
  type EventEnvelopeInput,
  eventEnvelopeBase,
} from "@new-cursor/events";
import { z } from "zod";

import { REPOSITORY_AGGREGATE } from "./aggregate-types";

export const repositoryRegisteredPayloadSchema = z.object({
  repositoryId: z.string().uuid(),
  name: z.string(),
  remoteUrl: z.string(),
  isExternal: z.boolean(),
});

export type RepositoryRegisteredPayload = z.infer<
  typeof repositoryRegisteredPayloadSchema
>;

export const repositoryRegisteredEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(REPOSITORY_AGGREGATE),
  eventType: z.literal("repository_registered"),
  payload: repositoryRegisteredPayloadSchema,
});

export type RepositoryRegisteredEvent = z.infer<
  typeof repositoryRegisteredEventSchema
>;

export const createRepositoryRegisteredEvent =
  defineEvent<RepositoryRegisteredEvent>(
    REPOSITORY_AGGREGATE,
    "repository_registered",
    repositoryRegisteredEventSchema,
  );

export function repositoryRegisteredPayload(input: {
  id: string;
  name: string;
  remoteUrl: string;
  isExternal: boolean;
}): RepositoryRegisteredPayload {
  return {
    repositoryId: input.id,
    name: input.name,
    remoteUrl: input.remoteUrl,
    isExternal: input.isExternal,
  };
}

export type RepositoryRegisteredEventInput = EventEnvelopeInput & {
  payload: RepositoryRegisteredPayload;
};

export const repositoryCloneCompletedPayloadSchema = z.object({
  repositoryId: z.string().uuid(),
  clonePath: z.string(),
});

export type RepositoryCloneCompletedPayload = z.infer<
  typeof repositoryCloneCompletedPayloadSchema
>;

export const repositoryCloneCompletedEventSchema = eventEnvelopeBase.extend({
  aggregateType: z.literal(REPOSITORY_AGGREGATE),
  eventType: z.literal("repository_clone_completed"),
  payload: repositoryCloneCompletedPayloadSchema,
});

export type RepositoryCloneCompletedEvent = z.infer<
  typeof repositoryCloneCompletedEventSchema
>;

export const createRepositoryCloneCompletedEvent =
  defineEvent<RepositoryCloneCompletedEvent>(
    REPOSITORY_AGGREGATE,
    "repository_clone_completed",
    repositoryCloneCompletedEventSchema,
  );

export function repositoryCloneCompletedPayload(input: {
  repositoryId: string;
  clonePath: string;
}): RepositoryCloneCompletedPayload {
  return {
    repositoryId: input.repositoryId,
    clonePath: input.clonePath,
  };
}
