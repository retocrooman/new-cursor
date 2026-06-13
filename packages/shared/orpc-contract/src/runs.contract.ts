import { oc } from "@orpc/contract";
import { z } from "zod";

import { runProjectionSchema } from "./runs.schemas";

const createInput = z.object({
  taskId: z.string().uuid(),
  agentId: z.string().uuid(),
  stage: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export const runsContract = oc.router({
  create: oc.input(createInput).output(runProjectionSchema),
});

export type CreateRunInput = z.infer<typeof createInput>;
