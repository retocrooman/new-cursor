import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "../../utils";

export type BadgeTone =
  | "zinc"
  | "indigo"
  | "cyan"
  | "emerald"
  | "amber"
  | "red";

export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "className"> & {
  tone?: BadgeTone;
  className?: string;
  children?: ReactNode;
};

const TONE_CLASS: Record<BadgeTone, string> = {
  zinc: "bg-surface-active text-muted-foreground",
  indigo:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

/**
 * カテゴリやステータスを短いラベルで表すための pill 型 atom。
 */
export function Badge({
  tone = "zinc",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={cx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
