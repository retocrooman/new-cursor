import { oc } from "@orpc/contract";
import { z } from "zod";
import { sortInputFor } from "./_common/list-filters";
import { listOutputFor } from "./_common/list-output";
import { taskProjectionSchema } from "./tasks.schemas";

const createInput = z.object({
  title: z.string().min(1),
  branchName: z.string().nullable().optional(),
  repositoryId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  background: z.string().nullable().optional(),
  verificationItems: z.string().nullable().optional(),
});

const listInput = z.object({
  search: z.string().optional(),
  sort: sortInputFor(z.enum(["createdAt", "updatedAt", "title"])).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  filters: z
    .object({
      parentTaskId: z.union([z.string().uuid(), z.null()]).optional(),
    })
    .optional(),
});

const getInput = z.object({
  id: z.string().uuid(),
});

export const tasksContract = oc.router({
  create: oc.input(createInput).output(taskProjectionSchema),
  list: oc.input(listInput).output(listOutputFor(taskProjectionSchema)),
  get: oc.input(getInput).output(taskProjectionSchema),
});

export type CreateTaskInput = z.infer<typeof createInput>;
export type ListTasksInput = z.infer<typeof listInput>;
