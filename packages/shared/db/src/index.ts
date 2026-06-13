export type { SQL } from "drizzle-orm";

export {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  not,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
export { drizzle } from "drizzle-orm/node-postgres";
export * from "./schema";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const rawClientMap = new WeakMap<object, Pool>();

export type CreateClientOptions = {
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
};

/**
 * 接続文字列から Drizzle クライアントを生成する。
 * 利用側で 1 回だけ呼び出し、context や DI で使い回す想定。
 * モジュールレベルで自動生成しないことで、テスト/本番/開発の接続切替を明示化する。
 */
export function createClient(
  connectionString: string,
  options: CreateClientOptions = {},
) {
  const client = new Pool({
    connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: (options.idleTimeout ?? 20) * 1000,
    connectionTimeoutMillis: (options.connectTimeout ?? 10) * 1000,
  });

  const db = drizzle(client, { schema });
  rawClientMap.set(db, client);

  return db;
}

export type Database = ReturnType<typeof createClient>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Drizzle の通常 client もしくはトランザクションどちらでも受け取れる型。 */
export type DbOrTx = Database | Transaction;

export function getRawClient(db: Database): Pool {
  const client = rawClientMap.get(db);
  if (!client) {
    throw new Error("Raw client not found for this database instance");
  }
  return client;
}

export function registerRawClient(
  db: Database | Transaction,
  client: Pool,
): void {
  rawClientMap.set(db, client);
}

export { schema };
