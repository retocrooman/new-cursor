import { forwardRef, type InputHTMLAttributes } from "react";

import { cx } from "../../utils";

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> & {
  /** バリデーションエラー時に枠線を赤くする。`FormField` の `aria-invalid` を渡す想定。 */
  invalid?: boolean;
  className?: string;
};

/** 単純なテキスト入力 atom。 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, type, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type ?? "text"}
      aria-invalid={invalid || undefined}
      className={cx(
        "h-7 w-full rounded-sm border bg-input px-2 text-sm text-foreground outline-none",
        "placeholder:text-muted-foreground",
        "transition-[border-color,box-shadow]",
        "focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid
          ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40"
          : "border-border",
        className,
      )}
      {...rest}
    />
  );
});
