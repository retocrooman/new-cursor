import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * 配送用 outbox。events（CQRS 記録）とは別テーブル。
 * 司令室がトランザクション内で events と同時に insert し、relay が未配送行を SQS へ publish する。
 */
export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** events.id — Worker inbox の冪等キー。 */
    eventId: uuid("event_id").notNull().unique(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    actorId: uuid("actor_id").notNull(),
    version: integer("version").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    /** null = 未配送。relay が publish 成功後にセットする。 */
    relayedAt: timestamp("relayed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pendingIndex: index("outbox_pending_idx").on(
      table.relayedAt,
      table.createdAt,
    ),
  }),
);
