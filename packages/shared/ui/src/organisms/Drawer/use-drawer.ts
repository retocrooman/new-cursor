import { useEffect } from "react";

export type UseDrawerOptions = {
  open: boolean;
  onClose: () => void;
  /** true の時、ESC / 背景クリック / 閉じるボタンで確認ダイアログを挟む */
  hasUnsavedChanges?: boolean;
  unsavedConfirmMessage?: string;
};

const DEFAULT_CONFIRM_MESSAGE = "未保存の変更があります。閉じますか？";

/**
 * Drawer の挙動ロジックを集約する hook。
 *
 * - ESC で `requestClose` を発火
 * - 開いている間は body のスクロールを抑制
 * - `hasUnsavedChanges` が true なら、閉じる操作の前に `window.confirm`
 *   で確認を挟む
 *
 * フォーカストラップは MVP 範囲外。`tabindex` の自然な遷移と aria-modal に
 * よるブラウザ既定挙動に任せる。
 */
export function useDrawer({
  open,
  onClose,
  hasUnsavedChanges = false,
  unsavedConfirmMessage = DEFAULT_CONFIRM_MESSAGE,
}: UseDrawerOptions) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (hasUnsavedChanges) {
          if (!window.confirm(unsavedConfirmMessage)) return;
        }
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, hasUnsavedChanges, unsavedConfirmMessage]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const requestClose = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm(unsavedConfirmMessage)) return;
    }
    onClose();
  };

  return { requestClose } as const;
}
