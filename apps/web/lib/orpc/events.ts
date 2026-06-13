import type { Database, Transaction, UserRole } from "@new-cursor/db";
import { ORPCError } from "@orpc/server";

import { mapErrors } from "./errors";

// `appendEvent` は `@new-cursor/events/server` subpath に閉じている。ここでは oRPC handler 用の
// 楽観ロック / 認可ガード / envelope ヘルパーだけを置く。

// Postgres unique_violation エラー（楽観ロック衝突）を判定する。
//
// drizzle は driver のエラーを `DrizzleQueryError` でラップし、元の node-postgres エラー
// （`.code` / `.constraint` を持つ）を `cause` に格納する。そのため top-level だけ
// でなく `cause` チェーンを辿って 23505 + 制約名一致を探す。
export function isAggregateVersionConflict(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current != null && depth < 5; depth += 1) {
    if (
      isPgError(current) &&
      current.code === "23505" &&
      current.constraint === "events_aggregate_version_unique"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

// 楽観ロックを使う書き込み処理を共通化する。
export async function withOptimisticLock<T>(
  db: Database,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  try {
    return await db.transaction(async (tx) => fn(tx));
  } catch (error) {
    if (isAggregateVersionConflict(error)) {
      throw new ORPCError("CONFLICT", {
        message:
          "他のユーザーが先に編集しています。最新を読み込み直してから再操作してください。",
      });
    }
    throw error;
  }
}

type PgError = { code?: string; constraint?: string };

function isPgError(error: unknown): error is PgError {
  return typeof error === "object" && error !== null;
}

/**
 * 書き込み系 oRPC ハンドラの共通ボイラープレートを 1 行に圧縮する。
 * 未ログイン（context.actorId が null）は UNAUTHORIZED にして features に到達させない。
 *
 * API レイヤーの真の認可ガードは `os.ts` の base middleware が担うため、本 helper の
 * null チェックは defense-in-depth。
 */
export function withWrite<
  C extends { db: Database; actorId: string | null },
  Input,
  Output,
>(
  fn: (args: {
    context: C & { actorId: string };
    input: Input;
    tx: Transaction;
  }) => Promise<Output>,
): (args: { context: C; input: Input }) => Promise<Output> {
  return async ({ context, input }) => {
    if (context.actorId === null) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "ログインが必要です。",
      });
    }
    const authedContext = context as C & { actorId: string };
    return mapErrors(() =>
      withOptimisticLock(authedContext.db, (tx) =>
        fn({ context: authedContext, input, tx }),
      ),
    );
  };
}

/**
 * 書き込み系の **admin only** oRPC ハンドラを 1 ラップで作る。
 * 内部で `withWrite` を呼ぶため、未ログインは UNAUTHORIZED。role が `"admin"` でなければ
 * FORBIDDEN を返す（staff も null role も拒否）。
 */
export function withAdmin<
  C extends { db: Database; actorId: string | null; role: UserRole | null },
  Input,
  Output,
>(
  fn: (args: {
    context: C & { actorId: string; role: "admin" };
    input: Input;
    tx: Transaction;
  }) => Promise<Output>,
): (args: { context: C; input: Input }) => Promise<Output> {
  return withWrite<C, Input, Output>(async ({ context, input, tx }) => {
    if (context.role !== "admin") {
      throw new ORPCError("FORBIDDEN", {
        message: "この操作には管理者権限が必要です。",
      });
    }
    const adminContext = context as C & { actorId: string; role: "admin" };
    return fn({ context: adminContext, input, tx });
  });
}

// projection + context から event envelope 部分（aggregateId / actorId / version /
// occurredAt）を生成する共通ヘルパー。`occurredAtFrom` で createdAt / updatedAt の
// どちらをイベント発生時刻に採用するか切り替える。
export function envelope<
  P extends {
    id: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  },
  C extends { actorId: string },
>(projection: P, context: C, occurredAtFrom: "created" | "updated") {
  return {
    aggregateId: projection.id,
    actorId: context.actorId,
    version: projection.version,
    occurredAt:
      occurredAtFrom === "updated"
        ? projection.updatedAt
        : projection.createdAt,
  };
}
