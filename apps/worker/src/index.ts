import { createServer } from "node:http";

import { createClient } from "@new-cursor/db";
import { processDeliveryMessages } from "@new-cursor/delivery-feature";
import { runHealthChecks } from "@new-cursor/utils";
import { dispatchToSubscribers } from "@new-cursor/worker-dispatch-feature";

import { env, sqsEnvFromProcess } from "./env";

const db = createClient(env.DATABASE_URL, { max: 5 });

async function pollQueue(): Promise<void> {
  try {
    const result = await processDeliveryMessages({
      db,
      sqs: sqsEnvFromProcess(),
      dispatch: async (tx, message) => {
        await dispatchToSubscribers(tx, message);
      },
    });
    if (result.processed > 0 || result.duplicates > 0) {
      console.log(
        `worker dispatch processed=${result.processed} duplicates=${result.duplicates}`,
      );
    }
  } catch (error) {
    console.error("worker poll failed", error);
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

server.listen(env.WORKER_PORT, () => {
  console.log(`worker listening on http://localhost:${env.WORKER_PORT}`);
  void pollQueue();
  setInterval(() => {
    void pollQueue();
  }, env.WORKER_POLL_INTERVAL_MS);
});
