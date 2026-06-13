"use client";

import {
  type EventIcon,
  type FormattedEvent,
  genericFallback,
  SYSTEM_ACTOR_ID,
} from "@new-cursor/events";
import type {
  EventAggregateType,
  EventListItem,
} from "@new-cursor/orpc-contract";
import { Badge, type BadgeTone } from "@new-cursor/ui";
import { useQuery } from "@tanstack/react-query";

import { formatTimestamp } from "@/lib/format/datetime";
import { orpcBrowser } from "@/lib/orpc/client.browser";

/**
 * 履歴イベント 1 件分を `FormattedEvent` に変換する関数。
 *
 * payload は型レベルでは `unknown`。`safeParse` を通過した payload に加えて、
 * parse 失敗 / 未知 eventType の場合は `payload === null` も到達する（その分岐は
 * `formatItem` が `genericFallback` に流す）。formatter には `safeParse` を通過した
 * payload のみ渡るため、呼び出し側は自分が担当する eventType の payload 型に cast する。
 */
export type EventFormatter = (payload: unknown) => FormattedEvent;

/**
 * eventType → formatter の辞書。ここに無い eventType / payload が null（サーバー側
 * `safeParse` 失敗）は `genericFallback` に流す（履歴は壊れない）。
 */
export type EventFormatterRegistry = Record<string, EventFormatter>;

type Props = {
  aggregateType: EventAggregateType;
  aggregateId: string;
  formatters: EventFormatterRegistry;
};

const ICON_LABEL: Record<EventIcon, string> = {
  create: "新規",
  update: "編集",
  delete: "削除",
  restore: "復元",
  transition: "遷移",
  system: "システム",
};

const ICON_TONE: Record<EventIcon, BadgeTone> = {
  create: "emerald",
  update: "indigo",
  delete: "red",
  restore: "amber",
  transition: "cyan",
  system: "zinc",
};

/**
 * ドロワー内の「履歴」タブ。`orpcBrowser.events.listByAggregate` を React Query で
 * 取得し、各行を `icon + title + 日時(JST) + actor` のタイムラインで描画する。
 * 1 行ごとの人間語訳は feature 側 formatter registry に委譲する。
 */
export function EventHistoryTab({
  aggregateType,
  aggregateId,
  formatters,
}: Props) {
  const query = useQuery({
    queryKey: ["events.listByAggregate", aggregateType, aggregateId],
    queryFn: () =>
      orpcBrowser.events.listByAggregate({ aggregateType, aggregateId }),
  });

  if (query.isLoading) {
    return (
      <div className="px-4 py-6 text-center text-xs text-zinc-500">
        読み込み中...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        履歴の取得に失敗しました
      </div>
    );
  }

  const events = query.data?.events ?? [];

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-xs text-zinc-500">
        履歴がまだありません
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200">
      {events.map((event) => {
        const formatted = formatItem(event, formatters);
        return (
          <li key={`${event.aggregateId}-${event.version}`} className="py-3">
            <div className="flex items-start gap-3">
              <Badge tone={ICON_TONE[formatted.icon]}>
                {ICON_LABEL[formatted.icon]}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {formatted.title}
                  </p>
                  <time
                    dateTime={event.createdAt}
                    className="shrink-0 text-xs tabular-nums text-zinc-500"
                  >
                    {formatTimestamp(event.createdAt)}
                  </time>
                </div>
                {formatted.summary ? (
                  <p className="mt-1 text-xs text-zinc-600">
                    {formatted.summary}
                  </p>
                ) : null}
                <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>by {formatActor(event.actorId)}</span>
                  <span aria-hidden>·</span>
                  <span>v{event.version}</span>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-zinc-400 hover:text-zinc-600">
                    raw JSON
                  </summary>
                  <pre className="mt-1 overflow-x-auto rounded-sm bg-zinc-50 p-2 text-[11px] text-zinc-700">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatItem(
  event: EventListItem,
  formatters: EventFormatterRegistry,
): FormattedEvent {
  if (event.payload == null) return genericFallback(event.eventType);
  const formatter = formatters[event.eventType];
  if (!formatter) return genericFallback(event.eventType);
  return formatter(event.payload);
}

/**
 * actorId の表示。システム発火（`SYSTEM_ACTOR_ID`）は「システム」、それ以外は
 * actorId（user の uuid）をそのまま出す。履歴 DTO は actorId のみ持つため、
 * user 名への解決はここでは行わない（contract の DTO 仕様に従う）。
 */
function formatActor(actorId: string): string {
  return actorId === SYSTEM_ACTOR_ID ? "システム" : actorId;
}
