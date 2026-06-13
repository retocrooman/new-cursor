import { oc } from "@orpc/contract";
import { z } from "zod";

import { agentsContract } from "./agents.contract";
import { commanderContract } from "./commander.contract";
import { decisionsContract } from "./decisions.contract";
import { eventsContract } from "./events.contract";
import { repositoriesContract } from "./repositories.contract";
import { rulesContract } from "./rules.contract";
import { runsContract } from "./runs.contract";
import { subscriptionsContract } from "./subscriptions.contract";
import { tasksContract } from "./tasks.contract";

const health = oc.output(
  z.object({
    status: z.string(),
    timestamp: z.string(),
  }),
);

const dbPing = oc.output(
  z.object({
    status: z.enum(["connected", "disconnected"]),
    timestamp: z.string(),
  }),
);

export const contract = oc.router({
  health,
  db: oc.router({
    ping: dbPing,
  }),
  agents: agentsContract,
  commander: commanderContract,
  decisions: decisionsContract,
  events: eventsContract,
  repositories: repositoriesContract,
  rules: rulesContract,
  runs: runsContract,
  subscriptions: subscriptionsContract,
  tasks: tasksContract,
});

export type Contract = typeof contract;

export * from "./_common/list-filters";
export * from "./_common/list-output";
export * from "./agent-models";
export * from "./agents.contract";
export * from "./agents.schemas";
export * from "./commander.contract";
export * from "./decisions.contract";
export * from "./decisions.schemas";
export * from "./events.contract";
export * from "./repositories.contract";
export * from "./repositories.schemas";
export * from "./rules.contract";
export * from "./rules.schemas";
export * from "./runs.contract";
export * from "./runs.schemas";
export * from "./subscriptions.contract";
export * from "./subscriptions.schemas";
export * from "./tasks.contract";
export * from "./tasks.schemas";
