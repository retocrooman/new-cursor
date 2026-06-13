import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string().url(),
    AWS_REGION: z.string().min(1).default("us-east-1"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    SQS_ENDPOINT: z.string().url().optional(),
    SQS_QUEUE_URL: z.string().url(),
    RELAY_PORT: z.coerce.number().int().positive().default(3002),
    RELAY_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  })
  .parse(process.env);

export function sqsEnvFromProcess() {
  return {
    region: env.AWS_REGION,
    endpoint: env.SQS_ENDPOINT,
    queueUrl: env.SQS_QUEUE_URL,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}
