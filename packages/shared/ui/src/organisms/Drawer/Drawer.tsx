"use client";

import type { ReactNode } from "react";

import { Button } from "../../atoms/Button";
import { cx } from "../../utils";

import { type UseDrawerOptions, useDrawer } from "./use-drawer";

export type DrawerProps = UseDrawerOptions & {
  title: string;
  description?: string;
  /** ヘッダー右側に出すアクション要素（保存・削除ボタン等） */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * 右からスライドインする編集 / 詳細用のドロワー。
 *
 * 幅は `min(560px, 50vw)`、背景は半透明オーバーレイ。`role="dialog"` +
 * `aria-modal="true"` を付け、SR には modal として通知する。
 */
export function Drawer({
  open,
  onClose,
  hasUnsavedChanges,
  unsavedConfirmMessage,
  title,
  description,
  actions,
  children,
  className,
}: DrawerProps) {
  const { requestClose } = useDrawer({
    open,
    onClose,
    hasUnsavedChanges,
    unsavedConfirmMessage,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="flex-1 cursor-default bg-zinc-900/30"
        onClick={requestClose}
        aria-label="閉じる"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "flex h-screen w-[min(560px,50vw)] flex-col border-l border-zinc-200 bg-white shadow-xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-zinc-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <Button
              variant="ghost"
              size="sm"
              onClick={requestClose}
              aria-label="閉じる"
            >
              ×
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
