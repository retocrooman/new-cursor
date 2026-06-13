import type { ReactNode } from "react";

import { cx } from "../../utils";

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  /** 主に Button を 1〜2 個並べる想定。空文字や null は描画しない */
  action?: ReactNode;
  className?: string;
};

/**
 * 「ゼロ件 / 未設定 / 該当なし」表示の molecule。table の `td` 内、
 * card の中、ページ中央など、どこに置いても潰れない垂直スタック。
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-2 px-4 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      {description ? (
        <p className="text-xs text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
