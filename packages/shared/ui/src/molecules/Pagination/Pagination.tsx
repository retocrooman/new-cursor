import type { ReactNode } from "react";

import { Button } from "../../atoms/Button";
import { cx } from "../../utils";

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  /** 左側に並べる任意の要約テキスト（例: `1-20 / 100 件`） */
  summary?: ReactNode;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
};

/**
 * 1 ページ単位の前後遷移コントローラ。総ページ数 / 現在ページの表示と
 * 「前 / 次」ボタンだけを提供し、件数表示は呼び出し側の自由に任せる
 * （`summary` slot）。
 *
 * `page` が `totalPages` を超過しているような不正値（URL `?page=999` の
 * 直打ち等）が来ても UI 上は `[1, max(1, totalPages)]` にクランプして
 * 表示する。`onPageChange` は範囲外の値（< 1 / > totalPages / 現在ページ）
 * が飛ばないよう内部で弾く。
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  summary,
  previousLabel = "前へ",
  nextLabel = "次へ",
  className,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const displayPage = Math.min(Math.max(1, page), safeTotalPages);

  function goTo(next: number) {
    if (next < 1 || next > safeTotalPages || next === displayPage) return;
    onPageChange(next);
  }
  return (
    <div
      className={cx(
        "flex items-center justify-between text-xs text-zinc-600",
        className,
      )}
    >
      <div>{summary}</div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={displayPage <= 1}
          onClick={() => goTo(displayPage - 1)}
        >
          {previousLabel}
        </Button>
        <span>
          {displayPage} / {safeTotalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={displayPage >= safeTotalPages}
          onClick={() => goTo(displayPage + 1)}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
