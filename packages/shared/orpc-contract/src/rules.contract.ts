import { oc } from "@orpc/contract";
import { z } from "zod";
import { sortInputFor } from "./_common/list-filters";
import { listOutputFor } from "./_common/list-output";
import { ruleProjectionSchema } from "./rules.schemas";

const createInput = z.object({
  labelId: z.string().uuid(),
  content: z.string().min(1),
});

const listInput = z.object({
  search: z.string().optional(),
  filters: z
    .object({
      labelId: z.string().uuid().optional(),
    })
    .optional(),
  sort: sortInputFor(z.enum(["createdAt", "updatedAt"])).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

const getInput = z.object({
  id: z.string().uuid(),
});

export const rulesContract = oc.router({
  create: oc.input(createInput).output(ruleProjectionSchema),
  list: oc.input(listInput).output(listOutputFor(ruleProjectionSchema)),
  get: oc.input(getInput).output(ruleProjectionSchema),
});

export type CreateRuleInput = z.infer<typeof createInput>;
