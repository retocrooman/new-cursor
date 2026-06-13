import { sql } from "@new-cursor/db";

import { eventsHandlers } from "./handlers/events";
import { osPublic } from "./os";

const healthHandler = osPublic.health.handler(() => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

const dbPingHandler = osPublic.db.ping.handler(async ({ context }) => {
  try {
    await context.db.execute(sql`SELECT 1`);
    return {
      status: "connected" as const,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      status: "disconnected" as const,
      timestamp: new Date().toISOString(),
    };
  }
});

export const router = osPublic.router({
  health: healthHandler,
  db: {
    ping: dbPingHandler,
  },
  events: eventsHandlers,
});

export type Router = typeof router;

export const readRouter = {
  health: healthHandler,
  db: {
    ping: dbPingHandler,
  },
  events: {
    listByAggregate: eventsHandlers.listByAggregate,
  },
} as const;

export type ReadRouter = typeof readRouter;
