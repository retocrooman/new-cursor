/**
 * リダイレクト先 URL のサニタイズ（open redirect 対策）。
 *
 * - `/` で始まる相対パスのみを許可する。
 * - `//` で始まる protocol-relative URL は外部サイトに飛ばせるため拒否する。
 * - `/\` で始まる Windows パス風文字列も拒否する。
 *
 * 信頼できない値だった場合は安全な既定値 `/` にフォールバックする。
 */
export function sanitizeRedirectTarget(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.startsWith("/\\")) return "/";
  return value;
}
