import {
  createClient,
  getRawClient,
  type Database,
  type Transaction,
} from "@new-cursor/db";
import { afterAll } from "vitest";

/**
 * テスト用 Drizzle クライアント。各テストは `withRollbackTx` でトランザクション
 * rollback により隔離する。
 */
const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/new_cursor";

export const testDb: Database = createClient(databaseUrl, {
  max: 4,
  idleTimeout: 5,
});

afterAll(async () => {
  await getRawClient(testDb).end();
});

class TestRollback extends Error {}

export async function withRollbackTx<T>(
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let captured: unknown;
  try {
    await testDb.transaction(async (tx) => {
      try {
        result = await fn(tx);
      } catch (error) {
        captured = error;
      }
      throw new TestRollback();
    });
  } catch (error) {
    if (!(error instanceof TestRollback)) {
      throw error;
    }
  }
  if (captured) {
    throw captured;
  }
  return result as T;
}
