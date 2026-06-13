"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";

import { cx } from "../../utils";

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
  disabled?: boolean;
};

export type TabsProps<T extends string = string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
  /**
   * tab と panel の id を結びつける base。`TabPanel` に同じ値を渡すことで
   * `aria-controls` / `aria-labelledby` が実在する要素を指すようにする。
   * 省略時は内部生成（panel を描画しない呼び出し向け）。
   */
  idBase?: string;
};

/** tab ボタンの id。`aria-labelledby` から参照される。 */
export const tabsTabId = (idBase: string, tabId: string): string =>
  `${idBase}-tab-${tabId}`;

/**
 * tab panel の id。`aria-controls` から参照される。アクティブな 1 panel だけを
 * 描画する前提のため、tab ごとではなく base 単位で 1 つに固定する。
 */
export const tabsPanelId = (idBase: string): string => `${idBase}-panel`;

/**
 * 横並びの薄い tab UI。中身（panel）はタブ切替の状態に応じて呼び出し側で
 * 描き分ける前提で、ここではタブヘッダーと aria 連携だけ提供する。
 * ドメイン非依存（@new-cursor/ui に置く）。
 *
 * WAI-ARIA Authoring Practices に合わせて:
 * - 1 ヘッダー内のみ `role="tablist"` を持ち、配下の各 button が
 *   `role="tab"` と `aria-controls` を持つ
 * - アクティブな tab だけ `tabindex={0}`、それ以外は `tabindex={-1}`
 * - ArrowLeft / ArrowRight / Home / End で disabled でない隣接 tab に
 *   フォーカス移動 + 値変更（automatic activation）
 */
export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  idBase,
}: TabsProps<T>) {
  const generatedId = useId();
  const baseId = idBase ?? generatedId;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    buttonRefs.current[index]?.focus();
  }

  function findNextEnabled(start: number, direction: 1 | -1): number {
    if (items.length === 0) return -1;
    let index = start;
    for (let step = 0; step < items.length; step++) {
      index = (index + direction + items.length) % items.length;
      const item = items[index];
      if (item && !item.disabled) return index;
    }
    return -1;
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = findNextEnabled(index, 1);
    } else if (event.key === "ArrowLeft") {
      nextIndex = findNextEnabled(index, -1);
    } else if (event.key === "Home") {
      nextIndex = findNextEnabled(items.length - 1, 1);
    } else if (event.key === "End") {
      nextIndex = findNextEnabled(0, -1);
    }
    if (nextIndex === null || nextIndex < 0 || nextIndex === index) return;
    event.preventDefault();
    const nextItem = items[nextIndex];
    if (nextItem) {
      onChange(nextItem.id);
      focusTab(nextIndex);
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        "flex items-center gap-1 border-b border-border",
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={tabsTabId(baseId, item.id)}
            aria-controls={tabsPanelId(baseId)}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            onClick={() => !item.disabled && onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              "-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
              item.disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export type TabPanelProps = {
  /** `Tabs` に渡したものと同じ `idBase`。 */
  idBase: string;
  /** 現在アクティブな tab の id（`aria-labelledby` の対象）。 */
  activeTabId: string;
  children: ReactNode;
  className?: string;
};

/**
 * `Tabs` と対になる tab panel。アクティブな tab の中身を 1 つだけ描画する前提で、
 * `Tabs` の各 tab の `aria-controls` が指す実体（`role="tabpanel"` + id）を提供する。
 */
export function TabPanel({
  idBase,
  activeTabId,
  children,
  className,
}: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={tabsPanelId(idBase)}
      aria-labelledby={tabsTabId(idBase, activeTabId)}
      className={className}
    >
      {children}
    </div>
  );
}
