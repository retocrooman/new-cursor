import { oc } from "@orpc/contract";
import { z } from "zod";

import { listOutputFor } from "./_common/list-output";
import { taskDecisionProjectionSchema } from "./decisions.schemas";

const listByTaskInput = z.object({
  taskId: z.string().uuid(),
});

const createInput = z.object({
  taskId: z.string().uuid(),
  summary: z.string().min(1),
  context: z.string().nullable().optional(),
  userResponse: z.string().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
});

export const decisionsContract = oc.router({
  listByTask: oc
    .input(listByTaskInput)
    .output(listOutputFor(taskDecisionProjectionSchema)),
  create: oc.input(createInput).output(taskDecisionProjectionSchema),
});

export type ListDecisionsByTaskInput = z.infer<typeof listByTaskInput>;
export type CreateTaskDecisionInput = z.infer<typeof createInput>;
