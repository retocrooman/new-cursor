import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

const isTest = process.env.NODE_ENV === "test";

/**
 * プロセス全体で 1 つだけ持つ pino のルートロガー。
 * 各リクエストはこの logger に `{ requestId, actorId }` を child binding したものを
 * RequestStore に詰めて持ち回す。
 */
export const logger = pino({
  level: isTest ? "silent" : "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});

export type Logger = typeof logger;

/**
 * 1 リクエスト分の横断コンテキスト。features / oRPC handler / Server Component の
 * どこからでも `getRequestStore()` で取り出して `store.logger.info(...)` できる。
 *
 * `actorId` は session を解決するまでは `null`。oRPC interceptor で session 解決後に
 * `store.actorId` と `store.logger` を更新する。
 */
export type RequestStore = {
  requestId: string;
  actorId: string | null;
  logger: Logger;
};

const requestStorage = new AsyncLocalStorage<RequestStore>();

/**
 * 受け取った store を bind した状態で `fn` を実行する。
 */
export function runWithRequestStore<T>(
  store: RequestStore,
  fn: () => Promise<T>,
): Promise<T> {
  return requestStorage.run(store, fn);
}

/**
 * 現在のリクエストの store を返す。リクエスト外で呼ばれた場合は `undefined`。
 */
export function getRequestStore(): RequestStore | undefined {
  return requestStorage.getStore();
}

/**
 * store が立っていればその child logger を、無ければルート logger を返す。
 */
export function getLogger(): Logger {
  return getRequestStore()?.logger ?? logger;
}

/**
 * `{ requestId, actorId }` を bind した child logger を生成する。
 */
export function createRequestLogger(input: {
  requestId: string;
  actorId: string | null;
}): Logger {
  return logger.child({
    requestId: input.requestId,
    actorId: input.actorId,
  });
}
