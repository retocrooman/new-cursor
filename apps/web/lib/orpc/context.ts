import { type Auth, getSession, isUserDeactivated } from "@new-cursor/auth";
import { type Database, eq, type UserRole, users } from "@new-cursor/db";
import { createRequestLogger, getRequestStore } from "@new-cursor/logger";

import { auth } from "../auth";
import { db } from "../db";

/**
 * oRPC handler に渡す context。
 *
 * - `actorId` は session があれば `user.id`、未ログインなら `null`。HTTP 経路では
 *   `os.ts` の base middleware が全 endpoint で `actorId === null` を UNAUTHORIZED に
 *   変換する。`withWrite` / `withAdmin` は defense-in-depth として残る。
 * - `role` は session があれば DB の `users.role` を毎リクエスト fetch する
 *   （cookieCache を経由しないため権限剥奪が即座に反映される）。
 * - `request` は HTTP 経路でのみ Request を持つ。in-process では `null`。
 */
export type OrpcContext = {
  db: Database;
  actorId: string | null;
  role: UserRole | null;
  auth: Auth;
  request: Request | null;
};

/**
 * actorId から `users.role` を SELECT する共有 helper。
 * DB 値が想定外の文字列 / null の場合は防御的に `null` を返す。
 */
export async function fetchUserRole(
  db: Database,
  userId: string,
): Promise<UserRole | null> {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const value = rows[0]?.role ?? null;
  if (value === "admin" || value === "staff") return value;
  return null;
}

export async function createOrpcContextFromRequest(
  request: Request,
): Promise<OrpcContext> {
  const session = await getSession(auth, request);
  // defense in depth: 無効化済みユーザーのセッションが残っていても未ログイン扱いにする
  // （os.ts の base middleware が actorId === null を UNAUTHORIZED に変換する）。
  const sessionUserId = session?.user.id ?? null;
  const actorId =
    sessionUserId && (await isUserDeactivated(db, sessionUserId))
      ? null
      : sessionUserId;
  const role = actorId ? await fetchUserRole(db, actorId) : null;

  // AsyncLocalStorage の store にも actorId を反映し、以降の child logger に
  // `actorId` フィールドが乗るようにする。
  const store = getRequestStore();
  if (store) {
    store.actorId = actorId;
    store.logger = createRequestLogger({
      requestId: store.requestId,
      actorId,
    });
  }

  return {
    db,
    actorId,
    role,
    auth,
    request,
  };
}
