/** DataTable の `td` / `th` 共通 padding */
export const dataTableCellPaddingClass = "px-4 py-2";

/**
 * 列定義で `cellClassName` を省略したときに DataTable が当てる既定 class。
 * `table-fixed` 下で truncate できるよう `min-w-0` を含む。
 */
export const dataTableDefaultCellClass = `min-w-0 ${dataTableCellPaddingClass}`;

/** DataTable の `<table>` 既定 class（`tableClassName` と merge される） */
export const dataTableTableClass = "table-fixed w-full";

// --- admin 一覧の列幅ランク + selection（colgroup / th / td で同一 rem を使う） ---

/**
 * ランク 1: 画面ごとに 1 列だけ。余った横幅はこの % 列のみが吸収する。
 * dense 一覧のみ `min-w-[16rem]` で rem 列合計による潰れを防ぐ。
 */
export const tableColRank1Primary = "w-[32%]";
export const tableColRank1PrimaryDense = "w-[32%] min-w-[16rem]";

/** ランク 2: 名前・メモ・メール（略称） */
export const tableColRank2Text = "w-[12rem]";

/** ランク 3: 日時など固定フォーマット列 */
export const tableColRank3Datetime = "w-[9rem]";

/** ランク 4: 価格のみ（tabular-nums） */
export const tableColRank4Price = "w-[7rem]";

/** ランク 5: 状態・ステータス・種別・件数・ロール・アクション */
export const tableColRank5Compact = "w-[5.5rem]";

/** チェックボックス列 */
export const tableColSelectionClass = "w-[3rem]";

const rank1PrimaryWidthClass = "w-[32%]";
const rank1PrimaryDenseWidthClass = "w-[32%] min-w-[16rem]";
const rank2TextWidthClass = "w-[12rem] max-w-[12rem]";
const rank3DatetimeWidthClass = "w-[9rem] max-w-[9rem]";
const rank4PriceWidthClass = "w-[7rem] max-w-[7rem]";
const rank5CompactWidthClass = "w-[5.5rem] max-w-[5.5rem]";

/**
 * 主列（商品名・ジョブ説明など）用。
 * `table-fixed` では % 幅で残りスペースを優先し、長文は truncate。
 */
export const cappedWideTableCellClass = `min-w-0 ${rank1PrimaryWidthClass} truncate ${dataTableCellPaddingClass}`;

/**
 * 補助列が多い一覧向けの主列。
 * rem 列の合計がテーブル幅を食い、% 主列が 0 になるのを `min-w-[16rem]` で防ぐ。
 */
export const cappedWideDenseTableCellClass = `min-w-0 ${rank1PrimaryDenseWidthClass} truncate ${dataTableCellPaddingClass}`;

/** 主列ヘッダー（`th` と同じ % 幅） */
export const tableHeaderColRank1Primary = `min-w-0 ${rank1PrimaryWidthClass} whitespace-nowrap`;

/** 補助列が多い一覧の主列ヘッダー */
export const tableHeaderColRank1PrimaryDense = `min-w-0 ${rank1PrimaryDenseWidthClass} whitespace-nowrap`;

/** メモ・メールなどの補助テキスト列 */
export const cappedMutedNotesCellClass = `min-w-0 ${rank2TextWidthClass} truncate ${dataTableCellPaddingClass} text-xs text-zinc-600`;

export const tableHeaderColRank2Text = `min-w-0 ${rank2TextWidthClass} whitespace-nowrap`;

/** 日時など rank 3 列 */
export const tableCellRank3DatetimeClass = `min-w-0 ${rank3DatetimeWidthClass} truncate whitespace-nowrap ${dataTableCellPaddingClass}`;

export const tableHeaderColRank3Datetime = `min-w-0 ${rank3DatetimeWidthClass} whitespace-nowrap`;

/** 価格列（rank 4・右寄せ） */
export const tableCellPriceClass = `min-w-0 ${rank4PriceWidthClass} truncate whitespace-nowrap ${dataTableCellPaddingClass} text-right tabular-nums`;

export const tableHeaderColRank4Price = `min-w-0 ${rank4PriceWidthClass} whitespace-nowrap text-right`;

/** 価格（控えめトーン） */
export const tableCellPriceMutedClass = `${tableCellPriceClass} text-zinc-700`;

/** ランク 5 コンパクト列（長文は truncate） */
export const cappedNarrowTableCellClass = `min-w-0 ${rank5CompactWidthClass} truncate whitespace-nowrap ${dataTableCellPaddingClass}`;

/** 状態・ステータス列ヘッダー（`<col>` rank 5 と同じ 5.5rem・左寄せ）。 */
export const tableHeaderColRank5Compact = `min-w-0 ${rank5CompactWidthClass} whitespace-nowrap`;

/**
 * ステータス Badge 列。`td` に `truncate` を当てると Badge 全文表示でも
 * セル右端に `...` が出るため、幅は rank 5 と同じ rem で cap し ellipsis は付けない。
 */
export const tableCellStatusBadgeClass = `min-w-0 ${rank5CompactWidthClass} overflow-visible whitespace-nowrap ${dataTableCellPaddingClass}`;

/** 件数・右寄せ数値（rank 5） */
export const tableCellNumericClass = `min-w-0 ${rank5CompactWidthClass} truncate whitespace-nowrap ${dataTableCellPaddingClass} text-right tabular-nums`;

/** 数値列ヘッダー（件数・rank 5） */
export const tableHeaderColNumericClass = `min-w-0 ${rank5CompactWidthClass} whitespace-nowrap text-right`;

/** 数値だが控えめなトーン */
export const tableCellNumericMutedClass = `${tableCellNumericClass} text-zinc-700`;

/** 更新日時などのタイムスタンプ列（rank 3・9rem） */
export const tableCellTimestampClass = `min-w-0 ${rank3DatetimeWidthClass} truncate whitespace-nowrap ${dataTableCellPaddingClass} text-xs text-zinc-500`;

export const tableHeaderColTimestampClass = tableHeaderColRank3Datetime;

/** 折り返し不要な短いテキスト・リンク・バッジ列 */
export const tableCellNowrapClass = cappedNarrowTableCellClass;

/** 名前・ラベルなど強調の nowrap 列（rank 2 テキスト向け） */
export const tableCellNowrapStrongClass = `min-w-0 ${rank2TextWidthClass} truncate font-medium text-zinc-900 ${dataTableCellPaddingClass}`;

/** 予定日時など本文サイズの nowrap 列 */
export const tableCellNowrapMediumClass = tableCellTimestampClass;

/** `th` でヘッダー折り返しを抑えたいとき */
export const tableHeaderNowrapClass = "whitespace-nowrap";

/** 数値列ヘッダー（右寄せ・折り返し抑制） */
export const tableHeaderNowrapRightClass = tableHeaderColNumericClass;
