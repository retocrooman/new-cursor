import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { inCheck } from "./enums";
import { repositories } from "./repositories";

export const TASK_STAGES = [
  "created",
  "worktree_requested",
  "worktree_ready",
  "queued",
  "implementing",
  "verify",
  "completed",
] as const;
export type TaskStage = (typeof TASK_STAGES)[number];

/**
 * task projection（最小）。Phase 3 は task.created のみ。
 */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    branchName: text("branch_name"),
    repositoryId: uuid("repository_id").references(() => repositories.id, {
      onDelete: "set null",
    }),
    parentTaskId: uuid("parent_task_id"),
    stage: text("stage").notNull().default("created"),
    worktreePath: text("worktree_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
  },
  (table) => ({
    stageCheck: check("tasks_stage_check", inCheck(table.stage, TASK_STAGES)),
    parentIndex: index("tasks_parent_idx").on(table.parentTaskId),
  }),
);
