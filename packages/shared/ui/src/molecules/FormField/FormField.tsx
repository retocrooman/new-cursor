import { type ReactNode, useId } from "react";

import { Label } from "../../atoms/Label";
import { cx } from "../../utils";

export type FormFieldProps = {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  /** 入力要素を render する関数。`id` / `aria-describedby` を受け取る。 */
  children: (renderProps: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => ReactNode;
  className?: string;
};

/**
 * Label + 入力要素 + ErrorText / Hint を一括で組み立てる molecule。
 *
 * - `htmlFor` ↔ input の `id` を `useId` で自動連結
 * - `aria-describedby` で hint / error を SR に紐付ける
 * - 入力要素自体は `children` の render prop に任せる（Input でも textarea
 *   でも select でも組み合わせ可能）
 */
export function FormField({
  label,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      {children({
        id: inputId,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-zinc-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
