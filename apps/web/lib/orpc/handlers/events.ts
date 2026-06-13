import { type EventDto, listByAggregate } from "@new-cursor/events-feature";
import { getLogger } from "@new-cursor/logger";
import type { EventListItem } from "@new-cursor/orpc-contract";

import { mapErrors } from "../errors";
import { os } from "../os";

/**
 * 履歴表示用 `events.listByAggregate` ハンドラ。
 * Phase 2 ではドメイン schema 未追加のため、全行を unknown fallback（payload: null）で返す。
 */
const listByAggregateHandler = os.events.listByAggregate.handler(
  ({ context, input }) => {
    return mapErrors(async () => {
      const rows = await listByAggregate(
        context.db,
        input.aggregateType,
        input.aggregateId,
      );
      const events = rows.map((row) => toUnknownEventListItem(row));
      return { events };
    });
  },
);

function toUnknownEventListItem(row: EventDto): EventListItem {
  getLogger().warn(
    {
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
    },
    "Event payload returned as unknown fallback (no domain schema registered)",
  );
  return {
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    eventType: row.eventType,
    actorId: row.actorId,
    createdAt: row.createdAt,
    version: row.version,
    payload: null,
  };
}

export const eventsHandlers = {
  listByAggregate: listByAggregateHandler,
};
