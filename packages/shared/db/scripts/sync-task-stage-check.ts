import pg from "pg";

import { TASK_STAGES } from "../src/schema/tasks";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/new_cursor";

const stageLiteral = TASK_STAGES.map((stage) => `'${stage}'`).join(", ");

const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  await pool.query(
    "ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_stage_check",
  );
  await pool.query(
    `ALTER TABLE tasks ADD CONSTRAINT tasks_stage_check CHECK (stage IN (${stageLiteral}))`,
  );
} finally {
  await pool.end();
}
