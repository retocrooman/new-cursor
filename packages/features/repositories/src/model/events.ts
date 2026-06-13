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
