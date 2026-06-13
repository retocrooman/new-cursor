/**
 * 一覧 / ドロワー / 履歴の日時表示フォーマッタ。ISO 文字列を受け取り、
 * 日本（JST）ロケールの短い日付 + 時刻に整形する。
 */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  });
}
