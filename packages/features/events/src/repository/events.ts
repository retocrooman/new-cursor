import { and, asc, type DbOrTx, eq, events } from "@new-cursor/db";

/**
 * events テーブルの読み出し（履歴表示用）。
 *
 * 設計判断:
 * - 全 aggregate 共通の SELECT で、ドメイン固有のロジックが入る余地がない。
 *   features に重複コードを並べる代わりに横断 feature `@new-cursor/events-feature`
 *   に 1 つだけ置く。
 * - features 同士の相互参照は禁止だが、`events-feature` は履歴 read 専用で他
 *   features への書き戻しを一切しないため、shared（db / events）にのみ依存する
 *   **集約系横断 feature** として扱う。`BaseRepository` は projection 向けの
 *   filter / sort / soft delete を前提とするのに対し、events は append-only な
 *   raw 読み出しのため継承しない。
 * - parse / フォーマットは handler 側の責任（`safeParse` + `payload=null`
 *   fallback）。ここでは raw payload を `unknown` のまま返す。
 */

/**
 * 履歴表示用の 1 イベント DTO（envelope + payload）。
 *
 * payload は parse せず raw（jsonb の生値）のまま返す。`actorId` は events
 * テーブルの値そのまま（システム発火は `SYSTEM_ACTOR_ID`）。`createdAt` は
 * events.occurred_at を ISO 8601 文字列にしたもの。
 */
export type EventDto = {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  version: number;
  actorId: string;
  createdAt: string;
  payload: unknown;
};

/**
 * 1 aggregate のタイムラインを version 昇順（古い → 新しい）で返す。
 *
 * version は `(aggregate_id, version)` UNIQUE で単調増加するため version のみで
 * 安定ソートになるが、念のため createdAt（occurred_at）を tiebreak に加える。
 */
export async function listByAggregate(
  tx: DbOrTx,
  aggregateType: string,
  aggregateId: string,
): Promise<EventDto[]> {
  const rows = await tx
    .select({
      eventType: events.eventType,
      aggregateType: events.aggregateType,
      aggregateId: events.aggregateId,
      version: events.version,
      actorId: events.actorId,
      occurredAt: events.occurredAt,
      payload: events.payload,
    })
    .from(events)
    .where(
      and(
        eq(events.aggregateType, aggregateType),
        eq(events.aggregateId, aggregateId),
      ),
    )
    .orderBy(asc(events.version), asc(events.occurredAt));

  return rows.map((row) => ({
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    version: row.version,
    actorId: row.actorId,
    createdAt: row.occurredAt.toISOString(),
    payload: row.payload,
  }));
}
