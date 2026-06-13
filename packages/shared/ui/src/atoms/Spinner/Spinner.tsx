import { cx } from "../../utils";

export type SpinnerSize = "xs" | "sm" | "md";

const SIZE_CLASS: Record<SpinnerSize, string> = {
  xs: "size-3 border-2",
  sm: "size-4 border-2",
  md: "size-5 border-2",
};

export type SpinnerProps = {
  size?: SpinnerSize;
  className?: string;
};

/** 回転するローディングインジケータ。 */
export function Spinner({ size = "sm", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="読み込み中"
      className={cx(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        SIZE_CLASS[size],
        className,
      )}
    />
  );
}
