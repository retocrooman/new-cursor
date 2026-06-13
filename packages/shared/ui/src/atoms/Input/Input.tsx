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
        "w-full rounded-md border bg-white px-3 py-1.5 text-sm outline-none transition-colors",
        invalid
          ? "border-red-500 focus:border-red-500"
          : "border-zinc-300 focus:border-zinc-500",
        className,
      )}
      {...rest}
    />
  );
});
