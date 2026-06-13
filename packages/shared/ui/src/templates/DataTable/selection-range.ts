import type { DataTableRowSelectability } from "./DataTable";

export type SelectableRow = { id: string };

/**
 * anchor 〜 target の表示順インデックス間で、選択可能な行 id を返す。
 * anchor / target が rows に無い場合は null（呼び出し側で通常 toggle にフォールバック）。
 */
export function getSelectableIdsInDisplayRange<
  TRow extends SelectableRow,
>(input: {
  rows: readonly TRow[];
  anchorId: string;
  targetId: string;
  isRowSelectable?: (row: TRow) => DataTableRowSelectability;
}): string[] | null {
  const { rows, anchorId, targetId, isRowSelectable } = input;
  const anchorIndex = rows.findIndex((row) => row.id === anchorId);
  const targetIndex = rows.findIndex((row) => row.id === targetId);
  if (anchorIndex === -1 || targetIndex === -1) return null;

  // slice の第2引数は exclusive なので +1 して anchor / target 両端を含める
  const lower = Math.min(anchorIndex, targetIndex);
  const upper = Math.max(anchorIndex, targetIndex);
  const ids: string[] = [];
  for (const row of rows.slice(lower, upper + 1)) {
    const verdict = isRowSelectable?.(row) ?? { selectable: true };
    if (verdict.selectable) ids.push(row.id);
  }

  const targetRow = rows[targetIndex];
  if (targetRow) {
    const targetVerdict = isRowSelectable?.(targetRow) ?? { selectable: true };
    if (targetVerdict.selectable && !ids.includes(targetId)) {
      ids.push(targetId);
    }
  }

  return ids;
}

export function mergeIdsIntoSelection(
  selectedIds: ReadonlySet<string>,
  idsToAdd: readonly string[],
): Set<string> {
  const next = new Set(selectedIds);
  for (const id of idsToAdd) next.add(id);
  return next;
}

export function toggleRowInSelection(
  selectedIds: ReadonlySet<string>,
  rowId: string,
): Set<string> {
  const next = new Set(selectedIds);
  if (next.has(rowId)) next.delete(rowId);
  else next.add(rowId);
  return next;
}
