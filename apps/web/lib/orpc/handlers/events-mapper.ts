import type { EventDto } from "@new-cursor/events-feature";
import { getLogger } from "@new-cursor/logger";
import {
  type EventListItem,
  taskCreatedEventListItem,
} from "@new-cursor/orpc-contract";

export function toEventListItem(row: EventDto): EventListItem {
  const base = {
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    eventType: row.eventType,
    actorId: row.actorId,
    createdAt: row.createdAt,
    version: row.version,
  };

  if (row.eventType === "task_created") {
    const parsed = taskCreatedEventListItem.safeParse({
      ...base,
      payload: row.payload,
    });
    if (parsed.success) {
      return parsed.data;
    }
  }

  getLogger().warn(
    {
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
    },
    "Event payload returned as unknown fallback (no domain schema registered)",
  );

  return {
    ...base,
    payload: null,
  };
}
