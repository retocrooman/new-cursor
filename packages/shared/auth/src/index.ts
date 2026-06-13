import { type Database, type DbOrTx, eq } from "@new-cursor/db";
import {
  accounts,
  sessions,
  users,
  verifications,
} from "@new-cursor/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";

/** 無効化（soft delete）されたユーザーが sign-in を試みたときのエラーメッセージ。 */
export const DEACTIVATED_USER_MESSAGE =
  "このアカウントは無効化されています。管理者に連絡してください。";

/**
 * 対象ユーザーが無効化（`users.deletedAt` 非 null）されているかを判定する。
 *
 * sign-in ブロック（databaseHooks）と、app 側のセッション検証（defense in depth）の
 * 両方から使う。better-auth が知らない追加カラムなので、adapter 経由ではなく
 * Drizzle で直接 `deleted_at` を引く。
 */
export async function isUserDeactivated(
  db: DbOrTx,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.deletedAt != null;
}

export type CreateAuthOptions = {
  /**
   * drizzle クライアントまたはトランザクション。
   * 通常運用は `@new-cursor/db` の `createClient` で生成した `Database` を渡す。
   * テストの `withRollbackTx` から `Transaction` を渡すケースもあるため `DbOrTx` で受ける。
   */
  db: DbOrTx;
  /** session cookie の暗号鍵。最低 32 文字。 */
  secret: string;
  /** better-auth が issuer として埋め込む base URL（例: `http://localhost:3000`）。 */
  baseURL: string;
  /**
   * `baseURL` 以外で許可したい追加 origin。Vercel の production alias と branch URL の
   * 両方からログインを許可したいケース等で使う。`baseURL` との重複と空文字は除外する。
   */
  additionalTrustedOrigins?: readonly string[];
};

/**
 * better-auth の `trustedOrigins` 配列を組み立てる pure helper。
 * `baseURL` を先頭に置き、`additionalTrustedOrigins` を続けて重複排除する。
 */
export function buildTrustedOrigins(
  baseURL: string,
  additionalTrustedOrigins: readonly string[] = [],
): string[] {
  const candidates: string[] = [];
  if (baseURL) candidates.push(baseURL);
  for (const origin of additionalTrustedOrigins) {
    if (origin) candidates.push(origin);
  }
  return [...new Set(candidates)];
}

/**
 * better-auth インスタンスを生成する。`apps/web` の Route Handler / Server Component /
 * oRPC interceptor などはすべて返り値 `auth` の API を共有する。
 *
 * MVP では emailAndPassword + cookie session のみを使う。テーブル名は複数形に揃えて
 * あるため `usePlural: true` で Drizzle スキーマと結びつける。
 */
export function createAuth({
  db,
  secret,
  baseURL,
  additionalTrustedOrigins,
}: CreateAuthOptions) {
  // drizzleAdapter は API 型上 `Database` を要求するが、postgres-js + drizzle は
  // client / transaction を区別せず同じインターフェースで動く。テストの rollback-tx
  // 経由で `Transaction` を渡せるようにここで 1 度だけ cast する。
  const adapterDb = db as Database;
  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: buildTrustedOrigins(baseURL, additionalTrustedOrigins),
    database: drizzleAdapter(adapterDb, {
      provider: "pg",
      schema: {
        users,
        sessions,
        accounts,
        verifications,
      },
      usePlural: true,
    }),
    databaseHooks: {
      session: {
        create: {
          /**
           * sign-in（= セッション生成）の直前に、対象ユーザーが無効化されていないかを
           * 検証する。無効化済みなら FORBIDDEN で弾く。これが「無効化ユーザーは新規
           * セッションを開始できない」ことの一次防御。`autoSignIn: false` のため
           * signUpEmail ではセッションを作らず、本フックは発火しない。
           */
          before: async (session) => {
            if (await isUserDeactivated(adapterDb, session.userId)) {
              throw new APIError("FORBIDDEN", {
                message: DEACTIVATED_USER_MESSAGE,
                code: "USER_DEACTIVATED",
              });
            }
          },
        },
      },
    },
    session: {
      // セッションを cookie に短期キャッシュし、handler 毎の sessions SELECT を抑制する。
      cookieCache: {
        enabled: true,
        maxAge: 60,
      },
    },
    user: {
      additionalFields: {
        // `admin` / `staff` の区別を保持する。DB 側で CHECK 制約をかけている。
        role: {
          type: "string",
          required: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
    },
    advanced: {
      database: {
        // events.actor_id が uuid 型のため Postgres の `gen_random_uuid()` に任せる。
        generateId: false,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * Request からアクティブなセッションを取り出す。未ログイン時は `null`。
 */
export async function getSession(
  auth: Auth,
  request: Request,
): Promise<Awaited<ReturnType<Auth["api"]["getSession"]>>> {
  return auth.api.getSession({ headers: request.headers });
}
