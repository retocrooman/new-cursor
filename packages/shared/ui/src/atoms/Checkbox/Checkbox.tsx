import { forwardRef, type InputHTMLAttributes } from "react";

import { cx } from "../../utils";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> & {
  className?: string;
};

/**
 * `<input type="checkbox">` の atom。ラベルとの組み合わせ方は呼び出し側で
 * 自由に決められるよう、ここでは input だけを提供する（例: `<label>`
 * で水平に並べる、`FormField` の render prop で組み合わせる、など）。
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cx(
          "size-4 rounded border-zinc-300 text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...rest}
      />
    );
  },
);
