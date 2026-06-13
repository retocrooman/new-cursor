"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

import { Button, type ButtonVariant } from "../../atoms/Button";
import { cx } from "../../utils";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** 追加の入力（reason の textarea など）を本文に差し込む */
  children?: ReactNode;
  className?: string;
};

/**
 * 中央配置の小さな確認ダイアログ。Drawer と異なり破壊的操作（無効化等）の
 * 直前確認に使う想定で、`onConfirm` を Button の variant で危険色に
 * できるようにしている。
 *
 * 設計メモ:
 * - ESC キーは capture phase で受け、`stopImmediatePropagation` で
 *   親の Drawer などに伝播させない（重ね表示時に Drawer まで閉じてしまう
 *   のを防ぐ）
 * - 背景クリックでは閉じない（誤クリックで確認をスキップさせない）
 * - 開いた瞬間にキャンセルボタンへフォーカスを当て、Enter キーの誤打で
 *   危険な確定操作が走らないようにする
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "実行",
  cancelLabel = "キャンセル",
  confirmVariant = "primary",
  confirming = false,
  onConfirm,
  onCancel,
  children,
  className,
}: ConfirmDialogProps) {
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || confirming) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      onCancel();
    };
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [open, confirming, onCancel]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // 危険な操作（無効化等）の誤確定を避けるため、初期フォーカスは
      // キャンセル側に置く。SR にも dialog が開いた事実が伝わる。
      cancelButtonRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={description ? descriptionId : undefined}
        className={cx(
          "w-full max-w-sm rounded-md border border-zinc-200 bg-white p-5 shadow-xl",
          className,
        )}
      >
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description ? (
          <p id={descriptionId} className="mt-2 text-xs text-zinc-600">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-3">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            ref={cancelButtonRef}
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            loading={confirming}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
