import { oc } from "@orpc/contract";
import { z } from "zod";

import { eventsContract } from "./events.contract";
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
  events: eventsContract,
  tasks: tasksContract,
});

export type Contract = typeof contract;

export * from "./_common/list-filters";
export * from "./events.contract";
export * from "./tasks.contract";
export * from "./tasks.schemas";
