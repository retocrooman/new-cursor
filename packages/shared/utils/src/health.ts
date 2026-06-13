import { GetQueueAttributesCommand, SQSClient } from "@aws-sdk/client-sqs";
import { createClient, type Database, getRawClient, sql } from "@new-cursor/db";

export type ConnectionStatus = "connected" | "disconnected";

export type HealthCheckResult = {
  status: "ok" | "degraded";
  timestamp: string;
  checks: {
    db: ConnectionStatus;
    sqs: ConnectionStatus;
  };
};

export type SqsEnv = {
  region: string;
  endpoint?: string;
  queueUrl: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

export async function checkDatabase(
  connectionString: string,
): Promise<ConnectionStatus> {
  const db = createClient(connectionString, { max: 1 });
  try {
    await db.execute(sql`SELECT 1`);
    return "connected";
  } catch {
    return "disconnected";
  } finally {
    await getRawClient(db).end();
  }
}

export async function checkDatabaseClient(
  db: Database,
): Promise<ConnectionStatus> {
  try {
    await db.execute(sql`SELECT 1`);
    return "connected";
  } catch {
    return "disconnected";
  }
}

export function createSqsClient(env: SqsEnv): SQSClient {
  return new SQSClient({
    region: env.region,
    endpoint: env.endpoint,
    credentials:
      env.accessKeyId && env.secretAccessKey
        ? {
            accessKeyId: env.accessKeyId,
            secretAccessKey: env.secretAccessKey,
          }
        : undefined,
  });
}

export async function checkSqs(env: SqsEnv): Promise<ConnectionStatus> {
  const client = createSqsClient(env);
  try {
    await client.send(
      new GetQueueAttributesCommand({
        QueueUrl: env.queueUrl,
        AttributeNames: ["QueueArn"],
      }),
    );
    return "connected";
  } catch {
    return "disconnected";
  } finally {
    client.destroy();
  }
}

export async function runHealthChecks(input: {
  databaseUrl: string;
  sqs: SqsEnv;
}): Promise<HealthCheckResult> {
  const [db, sqs] = await Promise.all([
    checkDatabase(input.databaseUrl),
    checkSqs(input.sqs),
  ]);
  const checks = { db, sqs };
  const status =
    checks.db === "connected" && checks.sqs === "connected" ? "ok" : "degraded";
  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
  };
}
