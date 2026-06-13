import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { inCheck } from "./enums";

export const INBOX_STATUSES = ["received", "processed"] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

/**
 * Worker の冪等受信記録。eventId / messageId はいずれも unique。
 */
export const inbox = pgTable(
  "inbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    messageId: text("message_id").notNull(),
    status: text("status").notNull().default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => ({
    eventIdUnique: uniqueIndex("inbox_event_id_unique").on(table.eventId),
    messageIdUnique: uniqueIndex("inbox_message_id_unique").on(table.messageId),
    statusIndex: index("inbox_status_idx").on(table.status, table.receivedAt),
    statusCheck: check(
      "inbox_status_check",
      inCheck(table.status, INBOX_STATUSES),
    ),
  }),
);
