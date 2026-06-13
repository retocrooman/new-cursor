import { oc } from "@orpc/contract";
import { z } from "zod";
import { sortInputFor } from "./_common/list-filters";
import { listOutputFor } from "./_common/list-output";
import { subscriptionProjectionSchema } from "./subscriptions.schemas";

const upsertInput = z.object({
  agentId: z.string().uuid(),
  eventTypes: z.array(z.string().min(1)),
});

const listInput = z.object({
  filters: z
    .object({
      agentId: z.string().uuid().optional(),
    })
    .optional(),
  sort: sortInputFor(z.enum(["createdAt", "updatedAt"])).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

const getInput = z.object({
  id: z.string().uuid(),
});

export const subscriptionsContract = oc.router({
  upsert: oc.input(upsertInput).output(subscriptionProjectionSchema),
  list: oc.input(listInput).output(listOutputFor(subscriptionProjectionSchema)),
  get: oc.input(getInput).output(subscriptionProjectionSchema),
});

export type UpsertSubscriptionInput = z.infer<typeof upsertInput>;
