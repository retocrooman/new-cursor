import { cx } from "../../utils";
import { tableColRank5Compact } from "./capped-wide-cell";

import type { DataTableCellContext } from "./DataTable";

export type StickyRightTableColumnClasses = {
  headerClassName: string;
  cellClassName: (ctx: DataTableCellContext<{ id: string }>) => string;
  colClassName: string;
};

export type StickyRightTableColumnClassesInput = {
  /** `th` に追加する class */
  headerExtra?: string;
  /** selected / unselected 両方の `td` に追加する class */
  cellExtra?: string;
};

/**
 * DataTable の右端 sticky 列用 class。
 *
 * 横スクロール時も状態列などを常時可視にし、行選択時の bg は `tr` から `td` に
 * 継承されないため `isSelected` で td 側の背景を切り替える。
 */
/** sticky 右端の状態・ステータス列幅（`<col>` compact numeric と同じ 5.5rem） */
const stickyRightColWidthClass = "w-[5.5rem] max-w-[5.5rem]";
export const tableColStickyRightClass = tableColRank5Compact;

export function stickyRightTableColumnClasses(
  input?: StickyRightTableColumnClassesInput,
): StickyRightTableColumnClasses {
  return {
    colClassName: tableColStickyRightClass,
    headerClassName: cx(
      "sticky right-0 z-10 overflow-visible whitespace-nowrap bg-zinc-50",
      stickyRightColWidthClass,
      input?.headerExtra,
    ),
    cellClassName: ({ isSelected }) =>
      isSelected
        ? cx(
            "sticky right-0 z-10 overflow-visible whitespace-nowrap bg-indigo-50 px-4 py-2",
            stickyRightColWidthClass,
            input?.cellExtra,
          )
        : cx(
            "sticky right-0 z-10 overflow-visible whitespace-nowrap bg-white px-4 py-2 group-hover:bg-zinc-50",
            stickyRightColWidthClass,
            input?.cellExtra,
          ),
  };
}
