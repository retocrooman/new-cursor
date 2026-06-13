import { forwardRef, type LabelHTMLAttributes, type ReactNode } from "react";

import { cx } from "../../utils";

export type LabelProps = Omit<
  LabelHTMLAttributes<HTMLLabelElement>,
  "className"
> & {
  required?: boolean;
  className?: string;
  children?: ReactNode;
};

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { required, children, className, ...rest },
  ref,
) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor は呼び出し側で対応する atom
    <label
      ref={ref}
      className={cx("block text-sm font-medium text-zinc-700", className)}
      {...rest}
    >
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
          <span className="sr-only">（必須）</span>
        </>
      ) : null}
    </label>
  );
});
