import { createServer } from "node:http";

import { createClient } from "@new-cursor/db";
import { relayPendingOutbox } from "@new-cursor/delivery-feature";
import { runHealthChecks } from "@new-cursor/utils";

import { env, sqsEnvFromProcess } from "./env";

const db = createClient(env.DATABASE_URL, { max: 5 });

async function pollOutbox(): Promise<void> {
  try {
    const result = await relayPendingOutbox({
      db,
      sqs: sqsEnvFromProcess(),
    });
    if (result.published > 0) {
      console.log(`relay published ${result.published} message(s)`);
    }
  } catch (error) {
    console.error("relay poll failed", error);
  }
}

const server = createServer(async (req, res) => {
  if (req.url !== "/health") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  const health = await runHealthChecks({
    databaseUrl: env.DATABASE_URL,
    sqs: sqsEnvFromProcess(),
  });
  const statusCode = health.status === "ok" ? 200 : 503;
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(health));
});

server.listen(env.RELAY_PORT, () => {
  console.log(`relay listening on http://localhost:${env.RELAY_PORT}`);
  void pollOutbox();
  setInterval(() => {
    void pollOutbox();
  }, env.RELAY_POLL_INTERVAL_MS);
});
