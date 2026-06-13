"use client";

import type { ReactNode } from "react";

import { cx } from "../../utils";

export type FilterBarProps = {
  /** チップ群（FilterChip を並べる）。 */
  children: ReactNode;
  /**
   * 現在適用中のフィルタ件数。`> 0` のとき「フィルタ N」と「クリア」ボタンが
   * 末尾に出る。0 / undefined の場合はクリアボタンを描画しない。
   */
  activeCount?: number;
  /** activeCount > 0 のときだけ呼ばれるクリアハンドラ。 */
  onClear?: () => void;
  /** スクリーンリーダー用のグループラベル（例: "ユーザーフィルタ"）。 */
  ariaLabel: string;
  clearLabel?: string;
  className?: string;
};

/**
 * フィルタチップを横並びにする dense なバー。
 *
 * - チップ間 gap、折り返し、適用件数表示、クリアボタンを束ねる
 * - チップ自体（FilterChip）はドメイン非依存だが、何を並べるかは呼び出し側に委ねる
 * - `role="group"` + `aria-label` でフィルタ群として SR に通知する
 *
 * デザイン: Notion / Linear / Airtable のフィルタバー風。
 */
export function FilterBar({
  children,
  activeCount,
  onClear,
  ariaLabel,
  clearLabel = "クリア",
  className,
}: FilterBarProps) {
  const hasActive = (activeCount ?? 0) > 0;
  return (
    <fieldset
      aria-label={ariaLabel}
      className={cx(
        "m-0 flex flex-wrap items-center gap-x-2 gap-y-2 border-0 p-0",
        className,
      )}
    >
      <legend className="sr-only">{ariaLabel}</legend>
      {children}
      {hasActive ? (
        <div className="ml-1 inline-flex items-center gap-1 text-xs text-zinc-500">
          <span aria-live="polite">フィルタ {activeCount}</span>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded px-1.5 py-0.5 text-xs text-zinc-500 underline-offset-2 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              aria-label={`${clearLabel} (${activeCount} 件)`}
            >
              ✕ {clearLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
