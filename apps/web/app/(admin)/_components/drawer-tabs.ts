import type { TabItem } from "@new-cursor/ui";

/**
 * 「詳細」「履歴」の 2 タブ構成。item / user の編集ドロワーで共有する。
 */
export type DetailHistoryTab = "detail" | "history";

export const DETAIL_HISTORY_TAB_ITEMS: readonly TabItem<DetailHistoryTab>[] = [
  { id: "detail", label: "詳細" },
  { id: "history", label: "履歴" },
];
