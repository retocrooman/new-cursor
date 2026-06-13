"use client";

import { type ReactNode, useState } from "react";

import { cx } from "../../utils";
import { Popover, type PopoverPlacement } from "../Popover";

export type FilterChipProps = {
  /** チップの常時表示ラベル（例: "ロール"）。 */
  label: string;
  /**
   * 選択中の値を 1 行で要約した文字列（例: "管理者, スタッフ"）。
   * `null` のときはチップを「未選択 (= ラベルのみ)」表示にする。
   */
  valueSummary?: string | null;
  /** チップ左端に出す小さなアイコン。色は親が決められるよう `currentColor` 推奨。 */
  icon?: ReactNode;
  /** popover 内に描画する中身（チェックボックスリスト / radio 等）。 */
  children: ReactNode;
  /** popover の `aria-label`（例: "ロールフィルタ"）。 */
  ariaLabel: string;
  /** popover の配置。default `bottom-start`。 */
  placement?: PopoverPlacement;
  /** popover content に追加で当てるクラス（幅指定等）。 */
  contentClassName?: string;
  /**
   * controlled open。外部で開閉を制御したい場合に渡す。未指定なら内部 state で
   * 管理する（typical な使い方）。
   */
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  /**
   * 選択値が「アクティブ」（= default ではない）かを示すフラグ。
   * 一覧の「フィルタ X 件適用中」表示と整合させるため、`valueSummary` の有無
   * とは独立に親が決められるようにする。
   */
  active?: boolean;
  className?: string;
};

/**
 * Notion 風コンパクトなフィルタチップ。
 *
 * - ボタン高さ 24-26px 程度の dense な見た目
 * - クリックで popover が開き、中身（children）が描画される
 * - 未選択時はラベルのみ、選択時は `valueSummary` を「:」区切りで表示
 * - active フラグでアウトラインを indigo に切り替える
 *
 * ドメイン非依存。「値」の意味づけは呼び出し側で決め、ここでは表示文字列だけ
 * 受け取る（role / status / 価格レンジ 等、何にでも使える）。
 *
 * popover の中身（children）の状態管理は呼び出し側の責務。チップは「label /
 * summary を出して開閉する」だけに徹する。
 */
export function FilterChip({
  label,
  valueSummary,
  icon,
  children,
  ariaLabel,
  placement = "bottom-start",
  contentClassName,
  open: openProp,
  onOpenChange,
  active = false,
  className,
}: FilterChipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  function handleOpenChange(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  const hasValue = Boolean(valueSummary);
  const showActive = active || hasValue;

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      placement={placement}
      ariaLabel={ariaLabel}
      contentClassName={contentClassName}
      className={className}
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          onClick={() => handleOpenChange(!open)}
          className={cx(
            "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs leading-none transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
            showActive
              ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
          )}
        >
          {icon ? (
            <span aria-hidden="true" className="inline-flex shrink-0">
              {icon}
            </span>
          ) : null}
          <span className="font-medium">{label}</span>
          {hasValue ? (
            <>
              <span aria-hidden="true" className="text-zinc-400">
                :
              </span>
              <span className="truncate font-normal">{valueSummary}</span>
            </>
          ) : null}
          <span aria-hidden="true" className="text-zinc-400">
            ▾
          </span>
        </button>
      )}
    >
      {children}
    </Popover>
  );
}
