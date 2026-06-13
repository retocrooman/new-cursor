import { cx } from "../../utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export type UseButtonOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** デフォルトは 1 行表示。複数行ラベルが必要なときだけ true。 */
  allowWrap?: boolean;
  className?: string;
};

const BASE_CLASS =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const WRAP_CLASS = "whitespace-normal break-keep";
const NOWRAP_CLASS = "whitespace-nowrap";

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
  ghost: "text-zinc-700 hover:bg-zinc-100",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

/**
 * Button の見た目決定ロジックを集約する hook。
 * className は呼び出し側の上書きを意図通り効かせるため `cx`（tailwind-merge）を通す。
 */
export function useButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  allowWrap = false,
  className,
}: UseButtonOptions) {
  const isDisabled = disabled || loading;
  const computed = cx(
    BASE_CLASS,
    allowWrap ? WRAP_CLASS : NOWRAP_CLASS,
    SIZE_CLASS[size],
    VARIANT_CLASS[variant],
    isDisabled && "cursor-not-allowed opacity-60",
    className,
  );
  return {
    buttonProps: {
      className: computed,
      disabled: isDisabled,
    },
    isLoading: loading,
    isDisabled,
  } as const;
}
