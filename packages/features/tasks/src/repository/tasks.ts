import { type DbOrTx, tasks } from "@new-cursor/db";
import { defineDomainError } from "@new-cursor/errors";
import { BaseRepository } from "@new-cursor/repository-kit";

import {
  type TaskProjection,
  type TaskRow,
  toTaskProjection,
} from "../model/projection";

export const TaskFeatureError = defineDomainError("Task", "tasks-feature");

class TasksRepository extends BaseRepository<TaskRow, TaskProjection> {
  protected override readonly table = tasks;
  protected override readonly errors = TaskFeatureError;
  protected override readonly defaultSort = {
    column: tasks.createdAt,
    direction: "asc" as const,
  };
  protected override readonly sortableFields = {
    createdAt: tasks.createdAt,
    updatedAt: tasks.updatedAt,
    title: tasks.title,
  };
  protected override readonly searchableColumns = [tasks.title];

  protected toProjection(row: TaskRow): TaskProjection {
    return toTaskProjection(row);
  }
}

const tasksRepository = new TasksRepository();

export async function insertTask(
  tx: DbOrTx,
  input: {
    title: string;
    branchName?: string | null;
    repositoryId?: string | null;
    parentTaskId?: string | null;
  },
): Promise<TaskProjection> {
  const now = new Date();
  const [row] = await tx
    .insert(tasks)
    .values({
      title: input.title,
      branchName: input.branchName ?? null,
      repositoryId: input.repositoryId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      stage: "created",
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
    .returning();

  if (!row) {
    throw TaskFeatureError.insertFailed();
  }

  return toTaskProjection(row as TaskRow);
}

export async function findTaskById(
  tx: DbOrTx,
  id: string,
): Promise<TaskProjection | null> {
  return tasksRepository.findById(tx, id);
}

export async function listTasks(
  tx: DbOrTx,
  opts?: Parameters<typeof tasksRepository.list>[1],
) {
  return tasksRepository.list(tx, opts);
}
