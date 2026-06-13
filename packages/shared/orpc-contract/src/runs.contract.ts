import { oc } from "@orpc/contract";
import { z } from "zod";

import { sortInputFor } from "./_common/list-filters";
import { listOutputFor } from "./_common/list-output";
import { runProjectionSchema } from "./runs.schemas";

const createInput = z.object({
  taskId: z.string().uuid(),
  agentId: z.string().uuid(),
  stage: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

const listInput = z.object({
  filters: z
    .object({
      taskId: z.string().uuid().optional(),
      agentId: z.string().uuid().optional(),
    })
    .optional(),
  sort: sortInputFor(z.enum(["createdAt", "updatedAt"])).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export const runsContract = oc.router({
  create: oc.input(createInput).output(runProjectionSchema),
  list: oc.input(listInput).output(listOutputFor(runProjectionSchema)),
});

export type CreateRunInput = z.infer<typeof createInput>;
