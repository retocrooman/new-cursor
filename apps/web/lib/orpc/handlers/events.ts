import { listByAggregate } from "@new-cursor/events-feature";

import { mapErrors } from "../errors";
import { os } from "../os";
import { toEventListItem } from "./events-mapper";

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
      const events = rows.map((row) => toEventListItem(row));
      return { events };
    });
  },
);

export const eventsHandlers = {
  listByAggregate: listByAggregateHandler,
};
