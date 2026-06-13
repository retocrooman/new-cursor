"use client";

import { type ReactNode, useId } from "react";

import { Checkbox } from "../../atoms/Checkbox";
import { FilterChip, type FilterChipProps } from "../FilterChip";

/**
 * `MultiSelectFilterChip` の 1 行（checkbox + label）。`value` はジェネリック
 * `T extends string` で受け、ドメイン型を知らない（呼び出し側で
 * `UserRole` / `ItemStatus` などにナローしてから渡す）。
 */
export type MultiSelectOption<T extends string> = {
  value: T;
  label: string;
};

/**
 * 共通 MultiSelectFilterChip の props。
 *
 * `MultiSelectFilterChip` 自体は **ドメイン非依存** で、`options` の表示順序と
 * label 表記、`value` の集合、`onChange` callback だけを受ける（@new-cursor/ui の
 * ドメイン非依存ポリシーを守る）。
 *
 * popover の見出し / aria / chip の見た目は親 `FilterChip` が司る。
 */
export type MultiSelectFilterChipProps<T extends string> = {
  /** chip 常時表示ラベル（例: "ロール" / "状態"）。 */
  label: string;
  /** chip 左端の小さなアイコン（任意）。 */
  icon?: ReactNode;
  /** popover の `aria-label`（例: "ロールフィルタ"）。 */
  ariaLabel: string;
  /** チェックボックス候補。表示順はこの配列順そのまま。 */
  options: ReadonlyArray<MultiSelectOption<T>>;
  /** 現在選択中の値集合。空配列 = 絞り込みなし。 */
  value: readonly T[];
  /** 選択集合の更新 callback。new 配列を返す。 */
  onChange: (next: readonly T[]) => void;
  /**
   * 1 行のサマリ文字列を組み立てる。default は選択中 option の `label` を
   * `, ` で join する（例: "管理者, スタッフ"）。0 件選択時は呼び出されず、chip の
   * valueSummary は null（= ラベルのみ表示）になる。
   */
  formatSummary?: (selected: ReadonlyArray<MultiSelectOption<T>>) => string;
  /** popover の content クラス（幅指定など）。FilterChip の同名 prop に渡す。 */
  contentClassName?: FilterChipProps["contentClassName"];
};

/**
 * 複数選択用の汎用フィルタ chip。
 *
 * - `options` は親が決めた表示順（業務上意味のある並び）をそのまま使う
 * - `value` に含まれる option の `label` をカンマ区切りで chip サマリに出す
 * - 全件未選択 (`value.length === 0`) は「絞り込みなし」として chip ラベルのみ表示
 *
 * ドメイン非依存。呼び出し側で `UserRole` / `ItemStatus` などを
 * `MultiSelectOption<T>` に詰めて渡す。
 */
export function MultiSelectFilterChip<T extends string>({
  label,
  icon,
  ariaLabel,
  options,
  value,
  onChange,
  formatSummary,
  contentClassName,
}: MultiSelectFilterChipProps<T>) {
  const groupId = useId();
  const selected = options.filter((opt) => value.includes(opt.value));
  const summary =
    selected.length === 0
      ? null
      : (formatSummary ?? defaultFormatSummary)(selected);

  function toggle(next: T) {
    if (value.includes(next)) {
      onChange(value.filter((v) => v !== next));
    } else {
      onChange([...value, next]);
    }
  }

  return (
    <FilterChip
      label={label}
      icon={icon}
      valueSummary={summary}
      ariaLabel={ariaLabel}
      contentClassName={contentClassName ?? "min-w-[12rem]"}
    >
      <ul className="space-y-1.5" aria-label={ariaLabel}>
        {options.map((opt) => {
          const checked = value.includes(opt.value);
          const inputId = `${groupId}-${opt.value}`;
          return (
            <li
              key={opt.value}
              className="flex items-center gap-2 text-xs text-zinc-700"
            >
              <Checkbox
                id={inputId}
                checked={checked}
                onChange={() => toggle(opt.value)}
              />
              <label htmlFor={inputId} className="cursor-pointer select-none">
                {opt.label}
              </label>
            </li>
          );
        })}
      </ul>
    </FilterChip>
  );
}

function defaultFormatSummary<T extends string>(
  selected: ReadonlyArray<MultiSelectOption<T>>,
): string {
  return selected.map((opt) => opt.label).join(", ");
}
