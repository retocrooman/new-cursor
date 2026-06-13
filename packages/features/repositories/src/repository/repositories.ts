import { type DbOrTx, eq, repositories } from "@new-cursor/db";
import { defineDomainError } from "@new-cursor/errors";
import { BaseRepository } from "@new-cursor/repository-kit";

import {
  type RepositoryProjection,
  type RepositoryRow,
  toRepositoryProjection,
} from "../model/projection";

export const RepositoryFeatureError = defineDomainError(
  "Repository",
  "repositories-feature",
);

class RepositoriesRepository extends BaseRepository<
  RepositoryRow,
  RepositoryProjection
> {
  protected override readonly table = repositories;
  protected override readonly errors = RepositoryFeatureError;
  protected override readonly defaultSort = {
    column: repositories.createdAt,
    direction: "desc" as const,
  };
  protected override readonly sortableFields = {
    createdAt: repositories.createdAt,
    updatedAt: repositories.updatedAt,
    name: repositories.name,
  };
  protected override readonly searchableColumns = [
    repositories.name,
    repositories.remoteUrl,
  ];

  protected toProjection(row: RepositoryRow): RepositoryProjection {
    return toRepositoryProjection(row);
  }
}

const repositoriesRepository = new RepositoriesRepository();

export async function registerRepository(
  tx: DbOrTx,
  input: {
    name: string;
    remoteUrl: string;
    isExternal?: boolean;
  },
): Promise<RepositoryProjection> {
  const now = new Date();
  const [row] = await tx
    .insert(repositories)
    .values({
      name: input.name,
      remoteUrl: input.remoteUrl,
      isExternal: input.isExternal ?? true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
    .returning();

  if (!row) {
    throw RepositoryFeatureError.insertFailed();
  }

  return toRepositoryProjection(row as RepositoryRow);
}

export async function findRepositoryById(
  tx: DbOrTx,
  id: string,
): Promise<RepositoryProjection | null> {
  return repositoriesRepository.findById(tx, id);
}

export async function listRepositories(
  tx: DbOrTx,
  opts?: Parameters<typeof repositoriesRepository.list>[1],
) {
  return repositoriesRepository.list(tx, opts);
}

export async function updateRepositoryClonePath(
  tx: DbOrTx,
  input: {
    repositoryId: string;
    clonePath: string;
  },
): Promise<RepositoryProjection> {
  const existing = await findRepositoryById(tx, input.repositoryId);
  if (!existing) {
    throw RepositoryFeatureError.notFound(input.repositoryId);
  }

  const now = new Date();
  const [row] = await tx
    .update(repositories)
    .set({
      clonePath: input.clonePath,
      updatedAt: now,
      version: existing.version + 1,
    })
    .where(eq(repositories.id, input.repositoryId))
    .returning();

  if (!row) {
    throw RepositoryFeatureError.notFound(input.repositoryId);
  }

  return toRepositoryProjection(row as RepositoryRow);
}
