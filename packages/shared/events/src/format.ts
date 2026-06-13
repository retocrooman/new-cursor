/**
 * 履歴表示で使う「人間語に翻訳された 1 イベント」の表現。
 *
 * features の各 `model/formatters.ts` は自ドメインの event payload を受け取って
 * この `FormattedEvent` を返す（React Node は返さない: features は React に依存させない）。
 * 装飾は呼び出し側（apps/web）で `icon` enum を見て行う。
 */
export type EventIcon =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "transition"
  | "system";

export type FormattedEvent = {
  icon: EventIcon;
  /** 1 行サマリ。 */
  title: string;
  /** 補足情報。なければ undefined。 */
  summary?: string;
};

/**
 * payload === null（壊れた payload / 未対応 event_type）の際に履歴表示が
 * 壊れないようにするためのジェネリックフォールバック。
 */
export function genericFallback(eventType: string): FormattedEvent {
  return {
    icon: "system",
    title: eventType,
    summary: "payload を解釈できませんでした",
  };
}

/**
 * ISO 8601 文字列を日本語ロケールの短い表示に変換する。
 * Invalid Date を防御的に検出して raw 文字列を返す。
 */
export function formatJaShortDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * delete / restore 系イベントの reason を「理由: ...」サマリに変換する。
 * undefined / 空文字は undefined を返す。
 */
export function reasonSummary(reason: string | undefined): string | undefined {
  return reason ? `理由: ${reason}` : undefined;
}
