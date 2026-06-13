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
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0";

const WRAP_CLASS = "whitespace-normal break-keep";
const NOWRAP_CLASS = "whitespace-nowrap";

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-7 px-2 text-xs",
  md: "h-7 px-2.5 text-sm",
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75",
  secondary:
    "border border-border bg-input text-foreground hover:bg-surface-hover active:bg-surface-active",
  ghost:
    "text-muted-foreground hover:bg-surface-hover hover:text-foreground active:bg-surface-active",
  danger:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
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
