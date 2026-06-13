import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { agents } from "./agents";
import { tasks } from "./tasks";

/**
 * タスク遂行中の重要な意思決定メモ（イベントとは別ドメイン）。
 * エージェントの判断に迷った箇所や、ユーザーへの質問とその回答を記録する。
 */
export const taskDecisions = pgTable(
  "task_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    context: text("context"),
    userResponse: text("user_response"),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    taskIndex: index("task_decisions_task_idx").on(table.taskId),
  }),
);

export type TaskDecisionRow = typeof taskDecisions.$inferSelect;
