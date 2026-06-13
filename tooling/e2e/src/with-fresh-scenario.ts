import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CreateQueueCommand, DeleteQueueCommand } from "@aws-sdk/client-sqs";
import { createSqsClient, type SqsEnv } from "@new-cursor/utils";
import pg from "pg";

export type FreshScenarioEnv = {
  databaseUrl: string;
  sqs: SqsEnv;
  schemaName: string;
  queueName: string;
};

const dbPackageDir = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../packages/shared/db",
);

function getBaseDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/new_cursor"
  );
}

function getBaseSqsConfig(): Omit<SqsEnv, "queueUrl"> {
  return {
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.SQS_ENDPOINT ?? "http://localhost:9324",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "x",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "x",
  };
}

function schemaDatabaseUrl(baseUrl: string, schemaName: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}options=${encodeURIComponent(`-csearch_path=${schemaName}`)}`;
}

export function pushPublicSchema(databaseUrl = getBaseDatabaseUrl()): void {
  execSync("pnpm exec drizzle-kit push --force", {
    cwd: dbPackageDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, CI: "true" },
    stdio: "pipe",
  });
}

async function ensurePublicTemplate(pool: pg.Pool): Promise<void> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'agents'
    ) AS exists`,
  );
  if (!rows[0]?.exists) {
    pushPublicSchema();
  }
}

async function clonePublicSchema(
  pool: pg.Pool,
  schemaName: string,
): Promise<void> {
  await pool.query(`CREATE SCHEMA "${schemaName}"`);
  await pool.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      LOOP
        EXECUTE format(
          'CREATE TABLE %I.%I (LIKE public.%I INCLUDING ALL)',
          '${schemaName}', r.tablename, r.tablename
        );
      END LOOP;
    END $$;
  `);
}

/** Per-scenario isolation: unique Postgres schema + SQS queue, torn down after fn. */
export async function withFreshScenario<T>(
  fn: (env: FreshScenarioEnv) => Promise<T>,
): Promise<T> {
  const baseDatabaseUrl = getBaseDatabaseUrl();
  const schemaName = `e2e_${randomUUID().replace(/-/g, "_")}`;
  const queueName = `e2e-${randomUUID()}`;
  const databaseUrl = schemaDatabaseUrl(baseDatabaseUrl, schemaName);

  const adminPool = new pg.Pool({ connectionString: baseDatabaseUrl });
  const sqsBase = getBaseSqsConfig();
  const sqsClient = createSqsClient({
    ...sqsBase,
    queueUrl: `${sqsBase.endpoint}/000000000000/placeholder`,
  });
  let queueUrl: string | undefined;

  try {
    await ensurePublicTemplate(adminPool);
    await clonePublicSchema(adminPool, schemaName);

    const createResponse = await sqsClient.send(
      new CreateQueueCommand({ QueueName: queueName }),
    );
    queueUrl = createResponse.QueueUrl;
    if (!queueUrl) {
      throw new Error("CreateQueue did not return QueueUrl");
    }

    const sqs: SqsEnv = { ...sqsBase, queueUrl };
    return await fn({ databaseUrl, sqs, schemaName, queueName });
  } finally {
    if (queueUrl) {
      try {
        await sqsClient.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
      } catch {
        // best-effort cleanup
      }
    }
    sqsClient.destroy();

    try {
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } catch {
      // best-effort cleanup
    }
    await adminPool.end();
  }
}
