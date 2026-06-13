import { createServer } from "node:http";

import { runHealthChecks } from "@new-cursor/utils";

import { env, sqsEnvFromProcess } from "./env";

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
});
