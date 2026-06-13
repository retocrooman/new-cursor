import { twMerge } from "tailwind-merge";

export type ClassValue = string | number | null | undefined | false;

/**
 * 条件付き class 文字列の合成 + Tailwind class の重複解決。
 *
 * - falsy（`null` / `undefined` / `false` / `0`）は除外する
 * - 戻り値は `tailwind-merge` を通すため、衝突は後勝ちに統一され、呼び出し側からの
 *   上書きを意図通りに反映できる
 */
export function cx(...inputs: ClassValue[]): string {
  return twMerge(
    inputs
      .filter((value): value is string | number => Boolean(value))
      .join(" "),
  );
}
