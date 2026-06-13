import type { TaskStage } from "@new-cursor/db";
import { auditFields, toAuditFields } from "@new-cursor/projections";
import { z } from "zod";

export const taskProjectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  branchName: z.string().nullable(),
  repositoryId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  stage: z.enum(["created", "worktree_requested", "worktree_ready", "queued"]),
  worktreePath: z.string().nullable(),
  ...auditFields,
});

export type TaskProjection = z.infer<typeof taskProjectionSchema>;

export type TaskRow = {
  id: string;
  title: string;
  branchName: string | null;
  repositoryId: string | null;
  parentTaskId: string | null;
  stage: string;
  worktreePath: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
};

export function toTaskProjection(row: TaskRow): TaskProjection {
  return taskProjectionSchema.parse({
    id: row.id,
    title: row.title,
    branchName: row.branchName,
    repositoryId: row.repositoryId,
    parentTaskId: row.parentTaskId,
    stage: row.stage as TaskStage,
    worktreePath: row.worktreePath,
    ...toAuditFields(row),
  });
}
