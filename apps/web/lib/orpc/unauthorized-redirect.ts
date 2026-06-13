/**
 * 401 (UNAUTHORIZED) を `/login?from=<現在パス>` への hard redirect に変換する。
 *
 * `client.browser.ts` の RPCLink の `fetch` から呼び出され、HTTP 401 を検知した瞬間に
 * 画面遷移を発火する。`window.location.href` で hard redirect することで、session 切れ後の
 * SPA 状態を残さない。`/login` 上では無限ループ防止で skip する。SSR では no-op。
 */
export function redirectToLoginOnUnauthorized(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname.startsWith("/login")) return;
  if (pathname === "/" && search === "") {
    window.location.href = "/login";
    return;
  }
  const from = `${pathname}${search}`;
  window.location.href = `/login?from=${encodeURIComponent(from)}`;
}
