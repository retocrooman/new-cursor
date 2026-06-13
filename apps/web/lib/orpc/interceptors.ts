import { getRequestStore } from "@new-cursor/logger";
import type { StandardHandleResult } from "@orpc/server/standard";

/**
 * oRPC root interceptor: 1 リクエスト = 1 ログレコードを出力する。
 *
 * `requestId` / `actorId` は AsyncLocalStorage の RequestStore から取り出す。
 * store が立っていない場合（テスト等）はサイレントに pass する。
 */
type InterceptorOptions = {
  request: {
    method?: string;
    url?: string | URL;
  };
  next: () => Promise<StandardHandleResult>;
};

export async function requestLoggerInterceptor(options: InterceptorOptions) {
  const store = getRequestStore();
  const start = performance.now();
  const path = extractPath(options.request.url);
  const method = options.request.method ?? "POST";

  try {
    const result = await options.next();
    const durationMs = Math.round(performance.now() - start);
    store?.logger.info(
      {
        method,
        path,
        matched: result.matched,
        status: result.response?.status,
        duration_ms: durationMs,
      },
      "rpc handled",
    );
    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    store?.logger.error(
      {
        method,
        path,
        duration_ms: durationMs,
        err: error,
      },
      "rpc failed",
    );
    throw error;
  }
}

function extractPath(url: string | URL | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return typeof url === "string" ? new URL(url).pathname : url.pathname;
  } catch {
    return typeof url === "string" ? url : undefined;
  }
}
