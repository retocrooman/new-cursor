import { type Database, events, type Transaction } from "@new-cursor/db";

import type { AppendableEvent } from "./envelope";

/**
 * events テーブルに 1 件追記する。
 * (aggregate_id, version) UNIQUE 制約により、同じバージョンが既に入っていたら
 * Postgres が unique_violation を投げる。呼び出し側（apps/web の `withOptimisticLock`）
 * はそれを 409 Conflict として扱う。
 *
 * **bundle 設計上の注意**: この関数は `@new-cursor/db` 経由で `postgres` driver に依存
 * するため、`./server` subpath からのみ export する。top-level `index.ts` から
 * re-export すると apps/web の client bundle に postgres driver が漏れるので絶対に
 * やらないこと。利用側は server-only なファイルからだけ
 * `import { appendEvent } from "@new-cursor/events/server"` する。
 */
export async function appendEvent<T extends AppendableEvent>(
  tx: Transaction | Database,
  event: T,
): Promise<void> {
  await tx.insert(events).values({
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    eventType: event.eventType,
    payload: event.payload,
    actorId: event.actorId,
    occurredAt: new Date(event.occurredAt),
    version: event.version,
  });
}
