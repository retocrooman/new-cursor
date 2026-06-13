"use client";

import { parseAsInteger, parseAsString } from "nuqs";

/**
 * admin 一覧画面で **すべてのドメインに共通** で乗せる URL クエリの nuqs parsers /
 * 派生 / setter 群。各ドメイン固有の `?status=` `?sort=` 等は呼び出し側で merge する。
 *
 * 設計方針:
 *  - shallow 更新（nuqs の default）で URL を書き換え、RSC を再要求しない。データ取得は
 *    React Query 経由。
 *  - default 一致時は `?key=` を URL から消して clean URL を保つ。
 *  - search / includeDeleted 等のフィルタ操作で `?page=` を必ず 1 に戻す規約を base setters
 *    で吸収する。
 */
export const baseListParsers = {
  q: parseAsString.withDefault(""),
  /** `"1"` で削除済みを含める。空文字 = default = 含めない。 */
  deleted: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  /** drawer 直開きの対象 id。 */
  id: parseAsString,
  /** `"1"` で新規追加 Drawer を開く。 */
  new: parseAsString.withDefault(""),
} as const;

export type BaseListRaw = {
  q: string;
  deleted: string;
  page: number;
  id: string | null;
  new: string;
};

export type BaseListParams = {
  /** 検索文字列（前後 trim 済み）。 */
  search: string;
  includeDeleted: boolean;
  page: number;
  selectedId: string | null;
  isNew: boolean;
};

export type BaseListSetters = {
  setSearch: (next: string | null) => void;
  setIncludeDeleted: (next: boolean) => void;
  setPage: (next: number) => void;
  setSelectedId: (next: string | null) => void;
  setIsNew: (next: boolean) => void;
};

export type BaseListSetRaw = (
  next: Partial<{
    q: string | null;
    deleted: string | null;
    page: number | null;
    id: string | null;
    new: string | null;
  }>,
) => unknown;

export function deriveBaseListParams(raw: BaseListRaw): BaseListParams {
  return {
    search: raw.q.trim(),
    includeDeleted: raw.deleted === "1",
    page: raw.page >= 1 ? raw.page : 1,
    selectedId: raw.id,
    isNew: raw.new === "1",
  };
}

/**
 * `setRaw` を base 部分の setter にラップする factory。
 * search / includeDeleted 系は `?page=` を必ず 1 に戻す。
 */
export function makeBaseListSetters(setRaw: BaseListSetRaw): BaseListSetters {
  return {
    setSearch: (next) => {
      const trimmed = next?.trim() ?? "";
      void setRaw({ q: trimmed === "" ? null : trimmed, page: null });
    },
    setIncludeDeleted: (next) => {
      void setRaw({ deleted: next ? "1" : null, page: null });
    },
    setPage: (next) => {
      void setRaw({ page: next <= 1 ? null : next });
    },
    setSelectedId: (next) => {
      void setRaw({ id: next || null });
    },
    setIsNew: (next) => {
      void setRaw({ new: next ? "1" : null });
    },
  };
}
