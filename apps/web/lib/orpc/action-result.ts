import { getLogger } from "@new-cursor/logger";
import { ORPCError } from "@orpc/server";

/**
 * Server Action から UI に返す共通の結果型。
 *
 * 例外を throw すると Next.js が一律 5xx として扱うため、409 (CONFLICT) / 404 (NOT_FOUND)
 * を UI で分岐できなくなる。discriminated union で表現して呼び出し側に分岐させる。
 *
 * `ERROR` の `data` には CustomError から転送された付帯情報（件数等）が載る。
 */
export type ActionResult<T, TLatest = T> =
  | { ok: true; data: T }
  | { ok: false; reason: "CONFLICT"; latest: TLatest }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "UNAUTHORIZED" }
  | {
      ok: false;
      reason: "ERROR";
      message: string;
      data?: Record<string, unknown>;
    };

const FALLBACK_ERROR_MESSAGE =
  "操作に失敗しました。時間をおいて再試行してください。";

/**
 * 内部エラーの詳細を **server 側にだけ** 記録する（クライアントには返さない）。
 * `@new-cursor/logger` はテスト時 silent なのでテスト出力は汚さない。
 */
export function logActionError(error: unknown): void {
  getLogger().error({ err: error }, "server action error");
}

/**
 * `ORPCError` をクライアント表示用メッセージに変換する。
 *
 * 意図的な domain エラー（`CustomError` 由来の NOT_FOUND / CONFLICT / BAD_REQUEST /
 * FORBIDDEN 等）はメッセージをそのまま見せてよい。一方 `INTERNAL_SERVER_ERROR`
 * （想定外の例外 / better-auth 内部詳細を包んだ `betterAuthFailed` 等）は内部情報を
 * 含みうるため generic message に潰し、詳細は server ログにのみ残す。
 */
export function clientSafeOrpcMessage(
  error: ORPCError<string, unknown>,
): string {
  if (error.code === "INTERNAL_SERVER_ERROR") {
    logActionError(error);
    return FALLBACK_ERROR_MESSAGE;
  }
  return error.message;
}

export type RunActionOptions<TLatest> = {
  /** 409 (CONFLICT) を検知した時に最新値を再取得する fetch。 */
  fetchLatestOnConflict?: () => Promise<TLatest | null>;
};

/**
 * Server Action 内で書き込み oRPC 呼び出しを包む共通ラッパー。
 *
 * - 成功時は `{ ok: true, data }`
 * - CONFLICT かつ `error.data` 無しは version 競合 → 最新値を取り直して CONFLICT を返す
 * - CONFLICT かつ `error.data` 有りはドメイン CONFLICT → ERROR に降格して `data` を保持
 * - NOT_FOUND / UNAUTHORIZED はそのまま
 * - その他はメッセージ付き ERROR
 */
export async function runAction<T, TLatest = T>(
  fn: () => Promise<T>,
  options: RunActionOptions<TLatest> = {},
): Promise<ActionResult<T, TLatest>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ORPCError) {
      const errorData = extractErrorData(error);
      if (error.code === "CONFLICT" && errorData === undefined) {
        const latest = options.fetchLatestOnConflict
          ? await safeFetch(options.fetchLatestOnConflict)
          : null;
        if (latest) {
          return { ok: false, reason: "CONFLICT", latest };
        }
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (error.code === "NOT_FOUND") {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (error.code === "UNAUTHORIZED") {
        return { ok: false, reason: "UNAUTHORIZED" };
      }
      // domain エラーのメッセージは見せる。INTERNAL_SERVER_ERROR は generic に潰す。
      return {
        ok: false,
        reason: "ERROR",
        message: clientSafeOrpcMessage(error),
        ...(errorData ? { data: errorData } : {}),
      };
    }
    // 非 ORPCError（想定外の例外）は内部メッセージを漏らさず generic に潰す。
    logActionError(error);
    return {
      ok: false,
      reason: "ERROR",
      message: FALLBACK_ERROR_MESSAGE,
    };
  }
}

/**
 * ORPCError.data から「意味のある付帯情報」を取り出す。
 * 空オブジェクト `{}` は付帯情報なしとみなして undefined を返す。
 */
function extractErrorData(
  error: ORPCError<string, unknown>,
): Record<string, unknown> | undefined {
  const data = error.data;
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.keys(data).length > 0
  ) {
    return data as Record<string, unknown>;
  }
  return undefined;
}

async function safeFetch<T>(fn: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
