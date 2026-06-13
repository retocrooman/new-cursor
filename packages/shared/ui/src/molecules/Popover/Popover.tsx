"use client";

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cx } from "../../utils";

import { usePopover } from "./use-popover";

export type PopoverPlacement = "bottom-start" | "bottom-end";

export type PopoverProps = {
  /** トリガー要素のレンダー関数。`triggerProps` をそのまま `<button>` 等に spread すれば aria 連携が完了する。 */
  trigger: (triggerProps: {
    id: string;
    "aria-haspopup": "dialog";
    "aria-expanded": boolean;
    "aria-controls": string;
  }) => ReactNode;
  /** Popover の中身。open 中だけ描画される。 */
  children: ReactNode;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** 影響範囲を抑えるための rough な配置指定。MVP では bottom-start / bottom-end の 2 択。 */
  placement?: PopoverPlacement;
  /** Popover に付与する `aria-label`。SR で「何の popover か」を伝えるために必須。 */
  ariaLabel: string;
  /** Popover 内部の class（width / padding 等の調整用）。 */
  contentClassName?: string;
  className?: string;
};

/**
 * 軽量 Popover primitive。
 *
 * - フィルタチップのドロップダウン UI 向け
 * - Content は `document.body` 直下へ portal し、trigger の矩形を基準に `fixed`
 *   配置する。Drawer 等の `overflow` 祖先にクリップされず、stacking も独立する。
 * - フォーカストラップなし（trigger 隣接の小さい UI なので tab で抜けられれば十分）
 * - 外側 click / ESC で閉じる
 *
 * autoplacement / flip / shift が要るほど高度な配置が必要になったら Floating UI
 * の導入を検討する。本コンポーネントは ListPage の filter chip 用途に限定。
 */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  placement = "bottom-start",
  ariaLabel,
  contentClassName,
  className,
}: PopoverProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const triggerId = useId();
  const contentId = useId();
  const [position, setPosition] = useState<CSSProperties | null>(null);

  usePopover({ open, onClose: () => onOpenChange(false), rootRef, contentRef });

  // trigger の矩形から固定配置の座標を計算する。open 中は scroll / resize にも追従。
  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.bottom + 4;
      setPosition(
        placement === "bottom-start"
          ? { top, left: rect.left }
          : { top, right: window.innerWidth - rect.right },
      );
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placement]);

  return (
    <div ref={rootRef} className={cx("relative inline-block", className)}>
      {trigger({
        id: triggerId,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        "aria-controls": contentId,
      })}
      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentRef}
              id={contentId}
              role="dialog"
              aria-label={ariaLabel}
              style={position}
              className={cx(
                "fixed z-[60] min-w-[14rem] rounded-md border border-zinc-200 bg-white p-3 shadow-lg focus:outline-none",
                contentClassName,
              )}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
