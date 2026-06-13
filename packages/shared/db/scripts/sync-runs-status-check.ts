import pg from "pg";

import { RUN_STATUSES } from "../src/schema/runs";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/new_cursor";

const statusLiteral = RUN_STATUSES.map((status) => `'${status}'`).join(", ");

const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  await pool.query(
    "ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_status_check",
  );
  await pool.query(
    `ALTER TABLE runs ADD CONSTRAINT runs_status_check CHECK (status IN (${statusLiteral}))`,
  );
} finally {
  await pool.end();
}
