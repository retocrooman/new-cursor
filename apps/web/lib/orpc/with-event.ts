import type { Transaction } from "@new-cursor/db";
import type { AppendableEvent, EventEnvelopeInput } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";

import type { OrpcContext } from "./context";
import { envelope, withAdmin, withWrite } from "./events";

/**
 * `eventSpec` が `aggregate` として受け付ける最低限の形。
 * features の projection はすべてこの形を満たす（`auditFields` 由来）。
 */
type EventProjection = {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * 1 件の event 追記指示を表す不透明型。`eventSpec` で組み立てる前提で、利用側が
 * 直接生オブジェクトを書かないようにあえて `payload` / `factory` を `unknown` に潰す
 * （厳密な型整合は `eventSpec` の generic で担保する）。
 */
export type EventSpec = {
  readonly aggregate: EventProjection;
  readonly payload: unknown;
  readonly factory: (
    input: EventEnvelopeInput & { payload: unknown },
  ) => AppendableEvent;
  readonly occurredAtFrom: "created" | "updated";
};

/**
 * 1 つの event 追記仕様を組み立てる helper。
 *
 * generic `<P, E>` により `payload` と `factory` の整合性をコンパイル時に縛る。
 * 別 event の payload を渡すと型エラーになる（CQRS で event テーブルに不整合が
 * 混入するのを防ぐ）。
 *
 * @example
 * eventSpec({
 *   aggregate: projection,
 *   payload: { name: projection.name, description: projection.description, status: projection.status },
 *   factory: createItemCreatedEvent,
 *   occurredAtFrom: "created",
 * })
 */
export function eventSpec<
  P extends EventProjection,
  E extends AppendableEvent,
>(spec: {
  aggregate: P;
  payload: E["payload"];
  factory: (input: EventEnvelopeInput & { payload: E["payload"] }) => E;
  occurredAtFrom: "created" | "updated";
}): EventSpec {
  return spec as unknown as EventSpec;
}

/**
 * write + event append のボイラープレートを 1 ハンドラ数行に圧縮する。
 *
 * 内部で行うこと:
 * 1. `withWrite`（または `requireAdmin: true` のとき `withAdmin`）で actorId の必須化と
 *    `withOptimisticLock` を被せる
 * 2. `run({ tx, input, context })` を実行して result と events を取得
 * 3. events を順に `envelope(...)` で組み立て、各 `factory` に渡して `appendEvent` で追記
 * 4. `result` を handler の戻り値として返す
 *
 * `events` は単一の `EventSpec` でも `EventSpec[]` でも受け付ける。複数 aggregate を
 * 1 transaction で更新する横断ユースケースは配列に積む（features 同士の相互参照は禁止、
 * 組み立ては handler 内で行う）。
 */
export function withEvent<Input, Result>(opts: {
  run: (args: {
    tx: Transaction;
    input: Input;
    context: OrpcContext & { actorId: string };
  }) => Promise<{
    result: Result;
    events: EventSpec | EventSpec[];
  }>;
  requireAdmin?: boolean;
}): (args: { context: OrpcContext; input: Input }) => Promise<Result> {
  const innerLogic = async ({
    tx,
    input,
    context,
  }: {
    tx: Transaction;
    input: Input;
    context: OrpcContext & { actorId: string };
  }): Promise<Result> => {
    const { result, events } = await opts.run({ tx, input, context });
    const list = Array.isArray(events) ? events : [events];
    for (const spec of list) {
      const appendable = spec.factory({
        ...envelope(spec.aggregate, context, spec.occurredAtFrom),
        payload: spec.payload,
      });
      const { eventId } = await appendEvent(tx, appendable);
      await writeOutbox(tx, { ...appendable, eventId });
    }
    return result;
  };

  if (opts.requireAdmin) {
    return withAdmin<OrpcContext, Input, Result>(innerLogic);
  }
  return withWrite<OrpcContext, Input, Result>(innerLogic);
}
