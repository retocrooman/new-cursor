"use client";

import { useEffect } from "react";

export type UsePopoverOptions = {
  open: boolean;
  onClose: () => void;
  /**
   * 「外側」と判定するための祖先要素。Trigger を含む root を渡す。
   */
  rootRef: { current: HTMLElement | null };
  /**
   * Content を portal で root の外（document.body 直下）に描画する場合に渡す。
   * Content 内の click を outside と誤判定して即閉じしないために必要。
   */
  contentRef?: { current: HTMLElement | null };
};

/**
 * Popover の閉じる挙動だけを切り出した hook。
 *
 * - ESC でクローズ
 * - `rootRef` 外への pointerdown でクローズ
 *
 * ポジショニング（trigger からの相対座標 / flip / shift）は MVP では扱わない。
 * Filter 用途の「trigger 直下に常に左寄せで出す」程度はネイティブ CSS で
 * 十分。本格的な popover が必要になったら Floating UI 等の導入を検討する。
 */
export function usePopover({
  open,
  onClose,
  rootRef,
  contentRef,
}: UsePopoverOptions) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!(event.target instanceof Node)) return;
      if (root.contains(event.target)) return;
      // portal で外に出した content 内の click は outside 扱いしない。
      if (contentRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    // pointerdown は capture phase で取って、click ハンドラより前に閉じ判定する。
    // mouseDown と touchStart の両方を 1 イベントで処理できる pointerdown が
    // mobile 含めて挙動が安定する。
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [open, onClose, rootRef, contentRef]);
}
