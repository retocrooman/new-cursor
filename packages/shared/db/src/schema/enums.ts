import type { AnyColumn } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * 文字列 enum を中央集権で持つ。
 * Postgres ENUM 型ではなく text + CHECK 制約で運用するため、
 * 値の追加だけならマイグレーションで CHECK を書き換えれば良い柔軟性を残している。
 *
 * ドメイン固有の enum 定数は Phase 2 以降の feature パッケージで追加する。
 */

/**
 * `column IN ('a', 'b', ...)` という CHECK 制約用の SQL fragment を生成する。
 * `sql.raw` を使わないと値が placeholder として展開されてマイグレーション SQL が
 * 壊れるため、文字列リテラルを手で組み立てている。値は事前定義 const なので
 * SQL injection 経路はない前提。
 */
export function inCheck<T extends string>(
  column: AnyColumn,
  values: readonly T[],
) {
  const literal = values
    .map((value) => `'${value.replace(/'/g, "''")}'`)
    .join(", ");
  return sql`${column} IN (${sql.raw(literal)})`;
}
