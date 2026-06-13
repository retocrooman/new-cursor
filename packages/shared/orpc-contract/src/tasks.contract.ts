import { oc } from "@orpc/contract";
import { z } from "zod";

import { taskProjectionSchema } from "./tasks.schemas";

const createInput = z.object({
  title: z.string().min(1),
  branchName: z.string().nullable().optional(),
  repositoryId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
});

export const tasksContract = oc.router({
  create: oc.input(createInput).output(taskProjectionSchema),
});

export type CreateTaskInput = z.infer<typeof createInput>;
