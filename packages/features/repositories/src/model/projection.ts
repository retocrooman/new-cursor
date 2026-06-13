import { auditFields, toAuditFields } from "@new-cursor/projections";
import { z } from "zod";

export const repositoryProjectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  remoteUrl: z.string(),
  clonePath: z.string().nullable(),
  isExternal: z.boolean(),
  ...auditFields,
});

export type RepositoryProjection = z.infer<typeof repositoryProjectionSchema>;

export type RepositoryRow = {
  id: string;
  name: string;
  remoteUrl: string;
  clonePath: string | null;
  isExternal: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
};

export function toRepositoryProjection(
  row: RepositoryRow,
): RepositoryProjection {
  return repositoryProjectionSchema.parse({
    id: row.id,
    name: row.name,
    remoteUrl: row.remoteUrl,
    clonePath: row.clonePath,
    isExternal: row.isExternal,
    ...toAuditFields(row),
  });
}
