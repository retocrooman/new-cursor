import { oc } from "@orpc/contract";
import { z } from "zod";
import { sortInputFor } from "./_common/list-filters";
import { listOutputFor } from "./_common/list-output";
import { agentProjectionSchema } from "./agents.schemas";

const createInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  labels: z.array(z.string().min(1)).optional(),
});

const listInput = z.object({
  search: z.string().optional(),
  sort: sortInputFor(z.enum(["createdAt", "updatedAt", "name"])).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

const getInput = z.object({
  id: z.string().uuid(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  modelId: z.string().nullable(),
});

export const agentsContract = oc.router({
  create: oc.input(createInput).output(agentProjectionSchema),
  list: oc.input(listInput).output(listOutputFor(agentProjectionSchema)),
  get: oc.input(getInput).output(agentProjectionSchema),
  update: oc.input(updateInput).output(agentProjectionSchema),
});

export type CreateAgentInput = z.infer<typeof createInput>;
