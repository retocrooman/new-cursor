import { sql } from "@new-cursor/db";

import { agentsHandlers } from "./handlers/agents";
import { commanderHandlers } from "./handlers/commander";
import { decisionsHandlers } from "./handlers/decisions";
import { eventsHandlers } from "./handlers/events";
import { repositoriesHandlers } from "./handlers/repositories";
import { rulesHandlers } from "./handlers/rules";
import { runsHandlers } from "./handlers/runs";
import { subscriptionsHandlers } from "./handlers/subscriptions";
import { tasksHandlers } from "./handlers/tasks";
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
  agents: agentsHandlers,
  commander: commanderHandlers,
  decisions: decisionsHandlers,
  events: eventsHandlers,
  repositories: repositoriesHandlers,
  rules: rulesHandlers,
  runs: runsHandlers,
  subscriptions: subscriptionsHandlers,
  tasks: tasksHandlers,
});

export type Router = typeof router;

export const readRouter = {
  health: healthHandler,
  db: {
    ping: dbPingHandler,
  },
  agents: {
    list: agentsHandlers.list,
    get: agentsHandlers.get,
  },
  events: {
    listByAggregate: eventsHandlers.listByAggregate,
  },
  repositories: {
    list: repositoriesHandlers.list,
    get: repositoriesHandlers.get,
  },
  rules: {
    list: rulesHandlers.list,
    get: rulesHandlers.get,
  },
  runs: {
    list: runsHandlers.list,
  },
  decisions: {
    listByTask: decisionsHandlers.listByTask,
  },
  subscriptions: {
    list: subscriptionsHandlers.list,
    get: subscriptionsHandlers.get,
  },
  tasks: {
    list: tasksHandlers.list,
    get: tasksHandlers.get,
  },
} as const;

export type ReadRouter = typeof readRouter;
