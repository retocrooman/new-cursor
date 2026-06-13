import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * 単一の events テーブル。すべての書き込み（作成・編集・状態遷移・削除）が
 * 1 行のイベントとして追記される。projection テーブルは同一トランザクションで
 * 更新され、events を source-of-truth、projection をクエリ最適化用と位置付ける。
 *
 * `payload` の中身は packages/shared/events のエンベロープ + 各 feature の
 * `model/events.ts` の Zod discriminated union で定義する。
 * `actor_id` は better-auth のユーザー id を入れる前提で UUID。
 *
 * 楽観ロックは `(aggregate_id, version)` UK で実現。同一 aggregate に対して
 * 同じ version のイベントは 1 つしか入らない。
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    actorId: uuid("actor_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer("version").notNull(),
  },
  (table) => ({
    aggregateVersionUnique: uniqueIndex("events_aggregate_version_unique").on(
      table.aggregateId,
      table.version,
    ),
    aggregateIndex: index("events_aggregate_idx").on(
      table.aggregateType,
      table.aggregateId,
      table.version,
    ),
    actorIndex: index("events_actor_idx").on(table.actorId, table.occurredAt),
    typeIndex: index("events_type_idx").on(table.eventType, table.occurredAt),
  }),
);
