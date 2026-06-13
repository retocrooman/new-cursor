import { createAuth, isUserDeactivated } from "@new-cursor/auth";
import { headers } from "next/headers";
import { cache } from "react";

import { db } from "./db";
import { env, resolveTrustedOrigins } from "./env";

/**
 * apps/web 全体で使う唯一の better-auth インスタンス。
 * Route Handler / Server Component / oRPC interceptor すべてここから import する。
 *
 * `SKIP_ENV_VALIDATION=true` 下の `next build` では `env.BETTER_AUTH_URL` が
 * undefined になり得るため、ビルド時の dummy として空文字列にフォールバックする。
 */
export const auth = createAuth({
  db,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? "",
  additionalTrustedOrigins: resolveTrustedOrigins(),
});

export type Auth = typeof auth;

/**
 * 同一リクエスト内で `auth.api.getSession` を 1 回だけ評価するためのラッパー。
 * React 19 の `cache()` で結果をメモ化する。
 *
 * defense in depth: セッションが残っていても無効化（soft delete）済みユーザーは
 * 未ログイン扱い（null）にする。通常は無効化時に sessions を purge + sign-in を
 * フックでブロックしているため到達しないが、直接 DB 操作などの抜け道を塞ぐ。
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session && (await isUserDeactivated(db, session.user.id))) {
    return null;
  }
  return session;
});
