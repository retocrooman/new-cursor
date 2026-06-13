import { describe, expect, it } from "vitest";

import { runHealthChecks } from "../src/health";

describe("runHealthChecks", () => {
  it("returns health shape with db and sqs checks", async () => {
    const result = await runHealthChecks({
      databaseUrl: "postgresql://invalid:invalid@127.0.0.1:1/nope",
      sqs: {
        region: "us-east-1",
        endpoint: "http://127.0.0.1:1",
        queueUrl: "http://127.0.0.1:1/000000000000/dev-queue",
        accessKeyId: "x",
        secretAccessKey: "x",
      },
    });

    expect(result.checks).toHaveProperty("db");
    expect(result.checks).toHaveProperty("sqs");
    expect(["ok", "degraded"]).toContain(result.status);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
