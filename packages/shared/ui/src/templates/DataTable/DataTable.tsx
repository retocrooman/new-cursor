"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { Checkbox } from "../../atoms/Checkbox";
import { cx } from "../../utils";
import {
  dataTableDefaultCellClass,
  dataTableTableClass,
  tableColSelectionClass,
} from "./capped-wide-cell";
import {
  getSelectableIdsInDisplayRange,
  mergeIdsIntoSelection,
  toggleRowInSelection,
} from "./selection-range";

export type DataTableRow = { id: string };

export type DataTableCellContext<TRow extends DataTableRow> = {
  row: TRow;
  isSelected: boolean;
};

export type DataTableColumn<TRow extends DataTableRow> = {
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  headerClassName?: string;
  /**
   * `td` に当てる class。row の `isSelected` を見て切り替える列（sticky
   * 状態列など、tr の bg を td に継承できないケース）では関数版を使う。
   */
  cellClassName?: string | ((ctx: DataTableCellContext<TRow>) => string);
  /**
   * `table-fixed` 用の `<col>` class。列幅はここで指定する（`td` / `th` の
   * `w-[%]` だけではブラウザが内容幅で再配分して主列が潰れる）。
   */
  colClassName?: string;
};

/**
 * 行の選択可否。`selectable: false` の場合、checkbox は disabled になり、
 * `reason` が `title` 属性 (= tooltip) / `aria-label` の末尾に乗る。
 */
export type DataTableRowSelectability =
  | { selectable: true }
  | { selectable: false; reason: string };

/**
 * DataTable の複数選択機能を制御する headless API。
 *
 * ドメイン非依存に保つため、選択状態の保持は呼び出し側 (`useState<Set<string>>`
 * など) に委ね、本 template は「render + イベント連携」だけを担う。
 *
 * 列レイアウト的には `columns` の左側に「☑」専用列が 1 列足され、ヘッダーには
 * 全選択 checkbox が出る。`isRowSelectable` で全選択対象の母集合を絞れる。
 *
 * checkbox は `td` 内で `event.stopPropagation()` するので、`onRowSelect` を
 * 持つテーブルでも「checkbox クリックで行選択は走らない」状態を保つ。
 *
 * Shift+クリックで anchor（直前にクリックした行）〜 対象行まで表示順に一括
 * 選択（ON）できる。anchor が rows に無い / 初回 Shift は通常 1 行 toggle に
 * フォールバック。`rows` が変わったら anchor はリセットする。
 */
export type DataTableSelection<TRow extends DataTableRow> = {
  /** 選択中の row.id 集合 (外部 state) */
  selectedIds: ReadonlySet<string>;
  /** 選択が変化したときに呼ばれる */
  onChange: (next: ReadonlySet<string>) => void;
  /**
   * 行が選択可能か。`selectable=false` の `reason` は tooltip / SR の説明に
   * 使う。未指定なら全行選択可能。
   */
  isRowSelectable?: (row: TRow) => DataTableRowSelectability;
  /** 個別行 checkbox の aria-label 生成。未指定なら "選択" 固定 */
  rowAriaLabel?: (row: TRow) => string;
  /** ヘッダー「全選択」checkbox の aria-label */
  selectAllAriaLabel?: string;
};

export type DataTableProps<TRow extends DataTableRow> = {
  rows: TRow[];
  columns: readonly DataTableColumn<TRow>[];
  /** 選択中の `row.id`。同じ id の行に強調スタイルを当てる */
  selectedRowId?: string | null;
  /** 行クリック / Enter / Space で発火。未指定なら行は非インタラクティブ */
  onRowSelect?: (row: TRow) => void;
  /**
   * 行が hover / focus されたとき発火。drawer route を `router.prefetch` する
   * 用途を想定しており、クリックされた瞬間のサーバー round trip を消すために
   * 先に route cache を温める。マウス操作 (`onMouseEnter`) と キーボード操作
   * (`onFocus`) の両方にバインドされる。
   */
  onRowPrefetch?: (row: TRow) => void;
  /** SR 向けの行ラベル */
  rowAriaLabel?: (row: TRow) => string;
  /**
   * `rows.length === 0` のときに tbody 末尾の `colspan` 行として描画。
   * `isLoading` が true のときは描画されない（プログレスバーだけで「読み込み中」を
   * 表現する想定。「読み込み完了 & 0 件」になって初めて Empty State を出す）。
   */
  emptyState?: ReactNode;
  /**
   * 初回ロード中であることを示す。true のとき、`rows.length === 0` でも
   * `emptyState` を描画しない（`ListPageShell` の `isPending` と組み合わせる前提）。
   *
   * default は false。
   */
  isLoading?: boolean;
  /**
   * 複数選択機能を有効化する。指定すると `columns` の左に「☑」列が追加され、
   * ヘッダーに全選択 checkbox が出る。state は呼び出し側で持つ。
   */
  selection?: DataTableSelection<TRow>;
  className?: string;
  tableClassName?: string;
};

/**
 * リソース一覧向けのテーブル template。列定義 + 行クリック + 選択ハイライト
 * + 空状態 slot だけを提供し、ソート / フィルタ / ページングは外部 hook
 * （URL state など）と切り離して呼び出し側で組む前提。
 *
 * 行は常に `group` class を持ち、列側の `cellClassName` から
 * `group-hover:` で hover bg を上書きできる（sticky right の状態列など、
 * `tr` の bg が `td` に継承されないケースの逃げ道）。
 *
 * セル内に Button などの clickable element を置く場合、その要素の onClick で
 * `event.stopPropagation()` を呼ばないと **行選択も同時に発火**する。
 */
export function DataTable<TRow extends DataTableRow>({
  rows,
  columns,
  selectedRowId,
  onRowSelect,
  onRowPrefetch,
  rowAriaLabel,
  emptyState,
  isLoading = false,
  selection,
  className,
  tableClassName,
}: DataTableProps<TRow>) {
  const isInteractive = Boolean(onRowSelect);
  const hasSelection = !!selection;
  const totalColumns = columns.length + (hasSelection ? 1 : 0);

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: TRow) {
    if (!onRowSelect) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowSelect(row);
    }
  }

  function resolveCellClass(
    column: DataTableColumn<TRow>,
    ctx: DataTableCellContext<TRow>,
  ): string {
    const custom =
      typeof column.cellClassName === "function"
        ? column.cellClassName(ctx)
        : column.cellClassName;
    return cx(dataTableDefaultCellClass, custom);
  }

  // 「現在の rows のうち選択可能なもの」の id 集合。全選択 checkbox の
  // 対象母集合 / indeterminate 判定に使う。`isRowSelectable` 未指定なら
  // 全行が母集合になる。
  const selectableIds = useMemo(() => {
    if (!selection) return null;
    const ids = new Set<string>();
    for (const row of rows) {
      const verdict = selection.isRowSelectable?.(row) ?? { selectable: true };
      if (verdict.selectable) ids.add(row.id);
    }
    return ids;
  }, [rows, selection]);

  // 選択状態の集計。全選択 checkbox の checked / indeterminate を出すために、
  // 「現在表示中で選択可能な行のうち、いくつが選択されてるか」を見る。
  const selectedAmongSelectable = useMemo(() => {
    if (!selection || !selectableIds) return 0;
    let count = 0;
    for (const id of selectableIds) {
      if (selection.selectedIds.has(id)) count++;
    }
    return count;
  }, [selection, selectableIds]);

  const selectAllChecked =
    selectableIds !== null &&
    selectableIds.size > 0 &&
    selectedAmongSelectable === selectableIds.size;
  const selectAllIndeterminate =
    selectableIds !== null &&
    selectedAmongSelectable > 0 &&
    selectedAmongSelectable < selectableIds.size;

  // <input type="checkbox"> の `indeterminate` は HTML 属性に存在せず JS
  // で setter する必要があるため、`useEffect` で同期する。
  const selectAllRef = useRef<HTMLInputElement>(null);
  /** Shift+クリック範囲選択の anchor（直前に checkbox をクリックした行 id） */
  const selectionAnchorRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectAllIndeterminate;
    }
  }, [selectAllIndeterminate]);

  // ページ / フィルタで表示行の並びが変わったら anchor を捨てる（参照だけの差し替えでは維持）
  const rowOrderKey = useMemo(
    () => rows.map((row) => row.id).join("\n"),
    [rows],
  );
  useEffect(() => {
    selectionAnchorRef.current = null;
  }, [rowOrderKey]);

  function handleSelectAllChange(event: ChangeEvent<HTMLInputElement>) {
    if (!selection || !selectableIds) return;
    const next = new Set(selection.selectedIds);
    if (event.target.checked) {
      for (const id of selectableIds) next.add(id);
    } else {
      // 「全解除」は selectable 行のみ外す。
      for (const id of selectableIds) next.delete(id);
    }
    selection.onChange(next);
    selectionAnchorRef.current = null;
  }

  function updateSelectionAnchor(rowId: string, selected: boolean) {
    if (selected) {
      selectionAnchorRef.current = rowId;
    } else if (selectionAnchorRef.current === rowId) {
      selectionAnchorRef.current = null;
    }
  }

  function handleRowCheckboxChange(
    row: TRow,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    if (!selection) return;
    event.stopPropagation();

    const verdict = selection.isRowSelectable?.(row) ?? { selectable: true };
    if (!verdict.selectable) return;

    if (event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey) {
      const anchorId = selectionAnchorRef.current;
      // anchor は「直前に選択した行」。解除済みの行を anchor にすると範囲が意図せず復活する
      if (anchorId && selection.selectedIds.has(anchorId)) {
        const rangeIds = getSelectableIdsInDisplayRange({
          rows,
          anchorId,
          targetId: row.id,
          isRowSelectable: selection.isRowSelectable,
        });
        if (rangeIds) {
          const idsToAdd =
            verdict.selectable && !rangeIds.includes(row.id)
              ? [...rangeIds, row.id]
              : rangeIds;
          const next = mergeIdsIntoSelection(selection.selectedIds, idsToAdd);
          selection.onChange(next);
          selectionAnchorRef.current = row.id;
          return;
        }
      }

      const next = toggleRowInSelection(selection.selectedIds, row.id);
      selection.onChange(next);
      updateSelectionAnchor(row.id, next.has(row.id));
      return;
    }

    const next = new Set(selection.selectedIds);
    if (event.target.checked) next.add(row.id);
    else next.delete(row.id);
    selection.onChange(next);
    updateSelectionAnchor(row.id, next.has(row.id));
  }

  return (
    <div
      className={cx(
        "overflow-x-auto rounded-md border border-zinc-200 bg-white",
        className,
      )}
    >
      <table
        className={cx(dataTableTableClass, "text-left text-sm", tableClassName)}
      >
        <colgroup>
          {hasSelection ? <col className={tableColSelectionClass} /> : null}
          {columns.map((column) => (
            <col key={column.id} className={column.colClassName} />
          ))}
        </colgroup>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            {hasSelection ? (
              <th
                scope="col"
                className="w-10 min-w-0 px-3 py-2 font-medium"
                aria-label={selection?.selectAllAriaLabel ?? "全選択"}
              >
                <Checkbox
                  ref={selectAllRef}
                  checked={selectAllChecked}
                  // checkbox が無効なケース (= 選択可能な行が 0) は不可視にせず
                  // disabled で残す（ヘッダーが空セルだと列幅が崩れるため）。
                  disabled={!selectableIds || selectableIds.size === 0}
                  onChange={handleSelectAllChange}
                  aria-label={selection?.selectAllAriaLabel ?? "全選択"}
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th
                key={column.id}
                className={cx(
                  "min-w-0 px-4 py-2 font-medium",
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selectedRowId === row.id;
            const rowClass = cx(
              "group border-b border-zinc-100 outline-none last:border-b-0",
              isInteractive &&
                "cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
              isSelected
                ? "bg-indigo-50"
                : isInteractive
                  ? "hover:bg-zinc-50"
                  : undefined,
            );
            const verdict = selection?.isRowSelectable?.(row) ?? {
              selectable: true,
            };
            const isRowSelected =
              hasSelection && selection
                ? selection.selectedIds.has(row.id)
                : false;
            const checkboxLabel = selection?.rowAriaLabel?.(row) ?? "選択";
            const checkboxAriaLabel = !verdict.selectable
              ? `${checkboxLabel}（${verdict.reason}）`
              : checkboxLabel;
            return (
              <tr
                key={row.id}
                tabIndex={isInteractive ? 0 : undefined}
                onClick={onRowSelect ? () => onRowSelect(row) : undefined}
                onKeyDown={(event) => handleKeyDown(event, row)}
                onMouseEnter={
                  onRowPrefetch ? () => onRowPrefetch(row) : undefined
                }
                onFocus={onRowPrefetch ? () => onRowPrefetch(row) : undefined}
                aria-label={rowAriaLabel?.(row)}
                aria-selected={isInteractive ? isSelected : undefined}
                className={rowClass}
              >
                {hasSelection ? (
                  <td
                    className="w-10 px-3 py-2"
                    onClick={(event: MouseEvent<HTMLTableCellElement>) =>
                      event.stopPropagation()
                    }
                  >
                    <Checkbox
                      checked={isRowSelected}
                      disabled={!verdict.selectable}
                      onChange={(event) => handleRowCheckboxChange(row, event)}
                      aria-label={checkboxAriaLabel}
                      title={!verdict.selectable ? verdict.reason : undefined}
                    />
                  </td>
                ) : null}
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={resolveCellClass(column, { row, isSelected })}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
          {rows.length === 0 && !isLoading && emptyState ? (
            <tr>
              <td colSpan={totalColumns}>{emptyState}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
