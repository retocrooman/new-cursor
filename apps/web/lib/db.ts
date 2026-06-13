import { createClient, type Database } from "@new-cursor/db";

import { env } from "./env";

declare global {
  var __newCursorDb: Database | undefined;
}

// Next.js の dev HMR で複数 DB クライアントが生成されるのを避けるためのシングルトン。
// 本番ビルドではモジュール評価が 1 度だけ走るためこの分岐は通らない。
//
// `SKIP_ENV_VALIDATION=true` 下の `next build` では `env.DATABASE_URL` が undefined に
// なり得る。postgres.js は接続を遅延するため、ビルド時の dummy 接続文字列で問題ない。
export const db: Database =
  globalThis.__newCursorDb ?? createClient(env.DATABASE_URL ?? "");

if (env.NODE_ENV !== "production") {
  globalThis.__newCursorDb = db;
}
