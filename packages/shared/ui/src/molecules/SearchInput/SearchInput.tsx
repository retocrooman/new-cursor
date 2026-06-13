"use client";

import { type FormEvent, useEffect, useState } from "react";

import { Button } from "../../atoms/Button";
import { Input } from "../../atoms/Input";
import { cx } from "../../utils";

export type SearchInputProps = {
  /** URL 等の外部状態に同期させる確定済みの検索文字列 */
  value: string;
  onSubmit: (next: string) => void;
  /** 渡すと「値があるときだけ」クリアボタンが出る */
  onClear?: () => void;
  placeholder?: string;
  ariaLabel: string;
  submitLabel?: string;
  clearLabel?: string;
  inputClassName?: string;
  className?: string;
};

/**
 * 「外部の確定値（URL の `?q` 等）」と「編集中のローカル文字列」を内部で
 * 切り分けて持つ search 用 molecule。
 *
 * - `value` が外部から差し替えられた場合、編集中ローカル state も追従する
 * - submit 時にトリム → 空文字なら親には空文字を渡す（親側で `null` 化
 *   などの解釈をする想定）
 * - クリアボタンは `onClear` が渡されている & 編集中 value が非空のときだけ
 *   描画。クリアの意味（URL `?q` 削除など）は親に任せる。
 */
export function SearchInput({
  value,
  onSubmit,
  onClear,
  placeholder,
  ariaLabel,
  submitLabel = "検索",
  clearLabel = "クリア",
  inputClassName,
  className,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(draft.trim());
  }

  function handleClear() {
    if (!onClear) return;
    setDraft("");
    onClear();
  }

  const showClear = Boolean(onClear) && draft.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className={cx("flex flex-1 items-center gap-2", className)}
    >
      <Input
        type="search"
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className={cx("max-w-xs", inputClassName)}
        aria-label={ariaLabel}
      />
      <Button type="submit" variant="secondary" size="sm">
        {submitLabel}
      </Button>
      {showClear ? (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          {clearLabel}
        </Button>
      ) : null}
    </form>
  );
}
