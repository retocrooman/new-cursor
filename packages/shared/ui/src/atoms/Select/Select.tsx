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
      "block h-7 w-full rounded-sm border bg-input px-2 text-sm text-foreground outline-none",
      "transition-[border-color,box-shadow]",
      "focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-ring/40",
      "disabled:cursor-not-allowed disabled:opacity-50",
      invalid
        ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40"
        : "border-border",
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
