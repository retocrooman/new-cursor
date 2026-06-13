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

export const TASK_STAGES = ["created"] as const;
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
    repositoryId: uuid("repository_id"),
    parentTaskId: uuid("parent_task_id"),
    stage: text("stage").notNull().default("created"),
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
