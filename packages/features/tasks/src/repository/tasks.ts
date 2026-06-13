import {
  and,
  asc,
  type DbOrTx,
  eq,
  ne,
  type TaskStage,
  tasks,
} from "@new-cursor/db";
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

export async function updateTaskStage(
  tx: DbOrTx,
  input: {
    taskId: string;
    fromStage: TaskStage;
    toStage: TaskStage;
  },
): Promise<{ projection: TaskProjection; updated: boolean }> {
  const existing = await findTaskById(tx, input.taskId);
  if (!existing) {
    throw TaskFeatureError.notFound(input.taskId);
  }

  if (existing.stage !== input.fromStage) {
    return { projection: existing, updated: false };
  }

  const now = new Date();
  const [row] = await tx
    .update(tasks)
    .set({
      stage: input.toStage,
      updatedAt: now,
      version: existing.version + 1,
    })
    .where(and(eq(tasks.id, input.taskId), eq(tasks.stage, input.fromStage)))
    .returning();

  if (!row) {
    const current = await findTaskById(tx, input.taskId);
    if (!current) {
      throw TaskFeatureError.notFound(input.taskId);
    }
    return { projection: current, updated: false };
  }

  return {
    projection: toTaskProjection(row as TaskRow),
    updated: true,
  };
}

export async function findBlockingTaskForRepoBranch(
  tx: DbOrTx,
  input: {
    repositoryId: string;
    branchName: string;
    excludeTaskId: string;
    taskCreatedAt: Date;
  },
): Promise<TaskProjection | null> {
  const rows = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.repositoryId, input.repositoryId),
        eq(tasks.branchName, input.branchName),
        ne(tasks.id, input.excludeTaskId),
      ),
    );

  for (const row of rows) {
    const stage = row.stage as TaskStage;
    if (stage === "worktree_ready" || stage === "implementing") {
      return toTaskProjection(row as TaskRow);
    }
    if (stage === "worktree_requested" && row.createdAt < input.taskCreatedAt) {
      return toTaskProjection(row as TaskRow);
    }
  }

  return null;
}

export async function findOldestQueuedTaskForRepoBranch(
  tx: DbOrTx,
  input: {
    repositoryId: string;
    branchName: string;
  },
): Promise<TaskProjection | null> {
  const rows = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.repositoryId, input.repositoryId),
        eq(tasks.branchName, input.branchName),
        eq(tasks.stage, "queued"),
      ),
    )
    .orderBy(asc(tasks.createdAt))
    .limit(1);

  const row = rows[0];
  return row ? toTaskProjection(row as TaskRow) : null;
}

export async function completeWorktreeReady(
  tx: DbOrTx,
  input: {
    taskId: string;
    worktreePath: string;
  },
): Promise<TaskProjection> {
  const existing = await findTaskById(tx, input.taskId);
  if (!existing) {
    throw TaskFeatureError.notFound(input.taskId);
  }

  if (existing.stage === "worktree_ready") {
    return existing;
  }

  if (existing.stage !== "worktree_requested") {
    return existing;
  }

  const now = new Date();
  const [row] = await tx
    .update(tasks)
    .set({
      stage: "worktree_ready",
      worktreePath: input.worktreePath,
      updatedAt: now,
      version: existing.version + 1,
    })
    .where(
      and(eq(tasks.id, input.taskId), eq(tasks.stage, "worktree_requested")),
    )
    .returning();

  if (!row) {
    const current = await findTaskById(tx, input.taskId);
    if (!current) {
      throw TaskFeatureError.notFound(input.taskId);
    }
    return current;
  }

  return toTaskProjection(row as TaskRow);
}
