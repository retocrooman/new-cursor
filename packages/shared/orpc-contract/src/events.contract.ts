import { oc } from "@orpc/contract";
import { z } from "zod";
import { agentCreatedEventListItem } from "./agents.schemas";
import { repositoryRegisteredEventListItem } from "./repositories.schemas";
import { ruleCreatedEventListItem } from "./rules.schemas";
import { runStartedEventListItem } from "./runs.schemas";
import { subscriptionUpsertedEventListItem } from "./subscriptions.schemas";
import {
  approvalGrantedEventListItem,
  approvalRequestedEventListItem,
  taskCompletedEventListItem,
  taskCreatedEventListItem,
  taskPrCreatedEventListItem,
  taskPrRequestedEventListItem,
  taskQueuedEventListItem,
  taskResumedEventListItem,
  taskStageChangedEventListItem,
  taskWaitingEventListItem,
  taskWorktreeReadyEventListItem,
} from "./tasks.schemas";

/**
 * 履歴表示用 oRPC contract。1 aggregate のタイムラインを version 昇順で返す。
 *
 * Phase 1 では item/user サンプルドメインを除外し、未知イベントのフォールバックのみ
 * 定義する。ドメイン固有の event schema は Phase 2 以降の feature パッケージ追加時に
 * `eventListItem` の discriminatedUnion へメンバを足す。
 *
 * **新規 event_type 追加時の推奨対応**:
 * - 該当 feature の `<domain>EventSchema` に追加する
 * - 本ファイルの `eventListItem` に対応行を追加する
 * - クライアント側 formatter registry にも追加する
 */

/** feature パッケージが `z.enum([...])` で拡張する aggregate type の土台。 */
export const EVENT_AGGREGATE_TYPES = [
  "task",
  "run",
  "repository",
  "agent",
  "subscription",
  "rule",
] as const;
export type EventAggregateType = (typeof EVENT_AGGREGATE_TYPES)[number];

const listByAggregateInput = z.object({
  aggregateType: z.string(),
  aggregateId: z.string().uuid(),
});

/**
 * contract union に無い eventType（未知 / 追加忘れ / 旧 event_type）のフォールバック。
 * handler 側で parse 失敗 / 未知時に `payload: null` へ正規化された行がここに落ちる。
 */
const unknownEventListItem = z.object({
  aggregateType: z.string(),
  aggregateId: z.string().uuid(),
  eventType: z.string(),
  payload: z.null(),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
});

/**
 * ドメイン event schema が揃うまで discriminatedUnion は未使用。
 * feature 追加時は `apiEventOf(...)` の配列で `z.discriminatedUnion("eventType", [...])` を定義し、
 * `unknownEventListItem` と `z.union` で合成する。
 */
export const eventListItemSchemas = [
  taskCreatedEventListItem,
  taskStageChangedEventListItem,
  taskWorktreeReadyEventListItem,
  taskQueuedEventListItem,
  taskPrRequestedEventListItem,
  taskPrCreatedEventListItem,
  approvalRequestedEventListItem,
  approvalGrantedEventListItem,
  taskWaitingEventListItem,
  taskResumedEventListItem,
  taskCompletedEventListItem,
  runStartedEventListItem,
  repositoryRegisteredEventListItem,
  agentCreatedEventListItem,
  subscriptionUpsertedEventListItem,
  ruleCreatedEventListItem,
] as const;

const eventListItemOrUnknown = z.union([
  taskCreatedEventListItem,
  taskStageChangedEventListItem,
  taskWorktreeReadyEventListItem,
  taskQueuedEventListItem,
  taskPrRequestedEventListItem,
  taskPrCreatedEventListItem,
  approvalRequestedEventListItem,
  approvalGrantedEventListItem,
  taskWaitingEventListItem,
  taskResumedEventListItem,
  taskCompletedEventListItem,
  runStartedEventListItem,
  repositoryRegisteredEventListItem,
  agentCreatedEventListItem,
  subscriptionUpsertedEventListItem,
  ruleCreatedEventListItem,
  unknownEventListItem,
]);
export type EventListItem = z.infer<typeof eventListItemOrUnknown>;

const listByAggregateOutput = z.object({
  events: z.array(eventListItemOrUnknown),
});
export type ListEventsByAggregateOutput = z.infer<typeof listByAggregateOutput>;
export type ListEventsByAggregateInput = z.infer<typeof listByAggregateInput>;

export const eventsContract = oc.router({
  listByAggregate: oc.input(listByAggregateInput).output(listByAggregateOutput),
});
