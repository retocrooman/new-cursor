/**
 * 履歴表示が読み出し対象とする aggregate type の集合。
 * Phase 2 では item/user サンプルドメインを除外。ドメイン追加時にここへ型を足す。
 */
export const EVENT_AGGREGATE_TYPES = ["task"] as const;

export type EventAggregateType = (typeof EVENT_AGGREGATE_TYPES)[number];
