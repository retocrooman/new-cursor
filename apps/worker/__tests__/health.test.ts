import { runHealthChecks } from "@new-cursor/utils";
import { describe, expect, it } from "vitest";

describe("worker health smoke", () => {
  it("runHealthChecks returns expected JSON shape", async () => {
    const health = await runHealthChecks({
      databaseUrl:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/new_cursor",
      sqs: {
        region: process.env.AWS_REGION ?? "us-east-1",
        endpoint: process.env.SQS_ENDPOINT,
        queueUrl:
          process.env.SQS_QUEUE_URL ??
          "http://localhost:9324/000000000000/dev-queue",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    expect(health).toMatchObject({
      checks: {
        db: expect.stringMatching(/connected|disconnected/),
        sqs: expect.stringMatching(/connected|disconnected/),
      },
    });
  });
});
