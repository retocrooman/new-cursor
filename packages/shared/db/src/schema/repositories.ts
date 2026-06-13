import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * 外部リポジトリ登録（Phase 4 は DB 登録のみ。clone は Phase 5）。
 */
export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    remoteUrl: text("remote_url").notNull(),
    isExternal: boolean("is_external").notNull().default(true),
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
    nameIndex: index("repositories_name_idx").on(table.name),
  }),
);

export type RepositoryRow = typeof repositories.$inferSelect;
