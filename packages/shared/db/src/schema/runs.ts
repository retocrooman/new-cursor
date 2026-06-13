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
import { agents } from "./agents";
import { inCheck } from "./enums";
import { tasks } from "./tasks";

export const RUN_STATUSES = ["running", "completed", "error"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

/**
 * タスクに紐づく実行記録。Phase 7 で run_started / run_completed と cursorAgentId を追加。
 */
export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "restrict" }),
    cursorAgentId: text("cursor_agent_id"),
    status: text("status").notNull().default("running"),
    stage: text("stage"),
    summary: text("summary"),
    errorMessage: text("error_message"),
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
    statusCheck: check(
      "runs_status_check",
      inCheck(table.status, RUN_STATUSES),
    ),
    taskIndex: index("runs_task_idx").on(table.taskId),
    agentIndex: index("runs_agent_idx").on(table.agentId),
  }),
);

export type RunRow = typeof runs.$inferSelect;
