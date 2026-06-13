import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";

import { Spinner } from "../Spinner";

import { type UseButtonOptions, useButton } from "./use-button";

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "className"
> &
  UseButtonOptions & {
    children?: ReactNode;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size,
      loading,
      disabled,
      allowWrap,
      className,
      children,
      type,
      ...rest
    },
    ref,
  ) {
    const { buttonProps, isLoading } = useButton({
      variant,
      size,
      loading,
      disabled,
      allowWrap,
      className,
    });
    return (
      <button ref={ref} type={type ?? "button"} {...rest} {...buttonProps}>
        {isLoading ? <Spinner size={size === "sm" ? "xs" : "sm"} /> : null}
        {children}
      </button>
    );
  },
);
