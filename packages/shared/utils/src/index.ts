/**
 * `undefined` を除外する型ガード。
 * `[a, b, c].filter(isDefined)` で型を絞り込める。
 */
export * from "./health";
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * リクエスト ID を 26 文字の大文字英数字で生成する（ULID 風）。
 *
 * proxy / API route の両方で同一フォーマットにし、ログ突合を容易にする。
 * 真の ULID/UUID 仕様には合わせていない（順序保証は要件外）。
 */
export function generateRequestId(): string {
  const time = Date.now().toString(36);
  const rand = randomToken();
  return `${time}${rand}`.toUpperCase().padEnd(26, "0").slice(0, 26);
}

function randomToken(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 14);
  }
  return Math.random().toString(36).slice(2, 16);
}
