import type { ReactNode } from "react";

import { cx } from "../../utils";

export type ListPageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  /** ヘッダー右端のボタン群（複数渡す場合は flex で並ぶ） */
  headerActions?: ReactNode;
  /** タイトル下に置く検索 / フィルタ等のツールバー */
  toolbar?: ReactNode;
  /** 主要本体（通常は `DataTable`） */
  children: ReactNode;
  /** 本体下に置くページネーション等 */
  footer?: ReactNode;
  /** 重ねて開くドロワー / ダイアログ類 */
  drawers?: ReactNode;
  /**
   * 一覧データの非同期更新中に toolbar と children の間に indeterminate
   * progress bar を表示する。children（DataTable）は **前データを保持** した
   * まま、bar だけが「更新中」を示す（dim 等で操作不能にしない）。
   *
   * default は false（bar 非表示、レイアウトに影響なし）。
   */
  isPending?: boolean;
  className?: string;
};

/**
 * 「ヘッダー + ツールバー + 本体 + フッター + ドロワー」の標準レイアウトを
 * 提供する template。管理画面の各リソース一覧ページで共通利用する想定。
 *
 * コンテナ幅 / padding はここで固定し、ページ間で揃える。各 slot に何を
 * 詰めるかは呼び出し側の責務（toolbar に `SearchInput` を入れる、children
 * に `DataTable` を入れる、など）。
 */
export function ListPageShell({
  title,
  description,
  headerActions,
  toolbar,
  children,
  footer,
  drawers,
  isPending = false,
  className,
}: ListPageShellProps) {
  return (
    <div
      className={cx(
        "mx-auto flex max-w-6xl flex-col gap-4 px-8 py-6",
        className,
      )}
    >
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
          ) : null}
        </div>
        {headerActions ? (
          <div className="flex items-center gap-2">{headerActions}</div>
        ) : null}
      </header>
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-3">{toolbar}</div>
      ) : null}
      <div className="relative">
        {isPending ? <IndeterminateProgressBar /> : null}
        {children}
      </div>
      {footer}
      {drawers}
    </div>
  );
}

const PROGRESS_KEYFRAME_NAME = "repo-list-page-shell-progress";

/**
 * toolbar / header と children の間に置く細い indeterminate progress bar。
 *
 * - position: absolute で children の上端に "張り出す" 形で表示するため、
 *   bar の有無で children 側のレイアウトは shift しない
 * - keyframe は React 19 の `<style href precedence>` で `<head>` に hoist +
 *   dedupe する。複数の ListPageShell が同時に mount しても 1 回だけ挿入
 * - 親 element が `position: relative` であることを呼び出し側に強制している
 */
function IndeterminateProgressBar() {
  return (
    <div
      role="progressbar"
      aria-label="一覧を更新しています"
      className="pointer-events-none absolute -top-2 left-0 right-0 h-0.5 overflow-hidden rounded-full bg-zinc-200/60"
    >
      <style href={PROGRESS_KEYFRAME_NAME} precedence="default">{`
        @keyframes ${PROGRESS_KEYFRAME_NAME} {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
      <div
        className="absolute inset-y-0 w-1/3 rounded-full bg-indigo-500"
        style={{
          animation: `${PROGRESS_KEYFRAME_NAME} 1.2s ease-in-out infinite`,
        }}
      />
    </div>
  );
}
