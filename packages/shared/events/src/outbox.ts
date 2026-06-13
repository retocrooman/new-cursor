import { type Database, outbox, type Transaction } from "@new-cursor/db";

import type { AppendableEvent } from "./envelope";

/**
 * events 追記と同一トランザクション内で outbox 行を insert する。
 */
export async function writeOutbox(
  tx: Transaction | Database,
  input: AppendableEvent & { eventId: string },
): Promise<void> {
  await tx.insert(outbox).values({
    eventId: input.eventId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    eventType: input.eventType,
    payload: input.payload,
    actorId: input.actorId,
    version: input.version,
    occurredAt: new Date(input.occurredAt),
  });
}
