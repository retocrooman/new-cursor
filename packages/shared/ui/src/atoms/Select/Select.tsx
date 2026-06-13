import { forwardRef, type SelectHTMLAttributes } from "react";

import { cx } from "../../utils";

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className"
> & {
  invalid?: boolean;
  className?: string;
};

/**
 * 単一選択 `<select>` の atom。`Input` と枠線・フォーカス系を揃え、
 * `FormField` の render prop から `id` / `aria-describedby` を受け取って
 * そのまま spread できるよう、ネイティブ属性を素通しする。
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ invalid, className, children, ...rest }, ref) {
    const computed = cx(
      "block w-full rounded-md border bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors",
      "focus-visible:ring-2",
      invalid
        ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
        : "border-zinc-300 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30",
      "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500",
      className,
    );
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={computed}
        {...rest}
      >
        {children}
      </select>
    );
  },
);
