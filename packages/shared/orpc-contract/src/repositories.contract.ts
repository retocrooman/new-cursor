import { oc } from "@orpc/contract";
import { z } from "zod";
import { sortInputFor } from "./_common/list-filters";
import { listOutputFor } from "./_common/list-output";
import { repositoryProjectionSchema } from "./repositories.schemas";

const registerInput = z.object({
  name: z.string().min(1),
  remoteUrl: z.string().url(),
  isExternal: z.boolean().optional(),
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

export const repositoriesContract = oc.router({
  register: oc.input(registerInput).output(repositoryProjectionSchema),
  list: oc.input(listInput).output(listOutputFor(repositoryProjectionSchema)),
  get: oc.input(getInput).output(repositoryProjectionSchema),
});

export type RegisterRepositoryInput = z.infer<typeof registerInput>;
export type ListRepositoriesInput = z.infer<typeof listInput>;
