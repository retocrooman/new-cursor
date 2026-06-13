import { z } from "zod";

/**
 * すべてのドメインイベントが共有する識別子の型。
 *
 * - `aggregateType`: events テーブルの aggregate_type に入る文字列
 * - `eventType`: イベントの種別。`<aggregate>_<past_tense>` の snake_case
 * - `aggregateId`: 対象 Aggregate の id（uuid）
 * - `actorId`: 操作者の uuid。システム発火は SYSTEM_ACTOR_ID を使う
 * - `version`: 楽観ロック用、対象 aggregate ごとの単調増加 version
 * - `occurredAt`: イベント発生時刻（ISO 8601）
 */
export const eventEnvelopeBase = z.object({
  aggregateType: z.string(),
  eventType: z.string(),
  aggregateId: z.string().uuid(),
  actorId: z.string().uuid(),
  version: z.number().int().positive(),
  occurredAt: z.string().datetime(),
});

export type EventEnvelopeBase = z.infer<typeof eventEnvelopeBase>;

/**
 * features 側の event factory が引数で受け取る envelope 部分。
 * payload と組み合わせて新しい event を組み立てる。
 */
export type EventEnvelopeInput = {
  aggregateId: string;
  actorId: string;
  version: number;
  occurredAt: string;
};

/**
 * appendEvent が受け取る最低限の形。
 * features の factory が返すオブジェクトはすべてこの形を満たす。
 */
export type AppendableEvent = EventEnvelopeBase & { payload: unknown };

/**
 * システムが発火するイベントに使う actor。
 * better-auth ユーザーテーブルとは独立した固定 uuid を予約する。
 */
export const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

/**
 * features の event factory を最短で定義するためのヘルパー。
 *
 * @example
 * export const createItemCreatedEvent = defineEvent<ItemCreatedEvent>(
 *   ITEM_AGGREGATE,
 *   "item_created",
 *   itemCreatedSchema,
 * );
 *
 * `aggregateType` / `eventType` を固定し、呼び出し側からは envelope と payload のみを
 * 受け取る。**fail-closed**: 組み立てた event を渡された Zod schema（discriminated union
 * の該当メンバ）で `.parse()` し、payload / envelope が不正なら `appendEvent` に渡る前に
 * その場で throw する。型パラメータ T で `payload` の型は縛られるが、ランタイムの
 * 不正値（DB enum 違反・必須欠落等）はこの検証で塞ぐ。
 */
export function defineEvent<T extends AppendableEvent>(
  aggregateType: T["aggregateType"],
  eventType: T["eventType"],
  schema: z.ZodTypeAny,
): (input: EventEnvelopeInput & { payload: T["payload"] }) => T {
  return (input) => schema.parse({ ...input, aggregateType, eventType }) as T;
}
