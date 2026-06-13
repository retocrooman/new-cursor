import type { EventDto } from "@new-cursor/events-feature";
import { getLogger } from "@new-cursor/logger";
import {
  agentCreatedEventListItem,
  type EventListItem,
  repositoryRegisteredEventListItem,
  ruleCreatedEventListItem,
  runStartedEventListItem,
  subscriptionUpsertedEventListItem,
  taskCreatedEventListItem,
  taskQueuedEventListItem,
  taskStageChangedEventListItem,
  taskWorktreeReadyEventListItem,
} from "@new-cursor/orpc-contract";

const eventParsers: Array<{
  eventType: string;
  parse: (base: EventListItemBase, payload: unknown) => EventListItem | null;
}> = [
  {
    eventType: "task_created",
    parse: (base, payload) => {
      const parsed = taskCreatedEventListItem.safeParse({ ...base, payload });
      return parsed.success ? parsed.data : null;
    },
  },
  {
    eventType: "task_stage_changed",
    parse: (base, payload) => {
      const parsed = taskStageChangedEventListItem.safeParse({
        ...base,
        payload,
      });
      return parsed.success ? parsed.data : null;
    },
  },
  {
    eventType: "task_worktree_ready",
    parse: (base, payload) => {
      const parsed = taskWorktreeReadyEventListItem.safeParse({
        ...base,
        payload,
      });
      return parsed.success ? parsed.data : null;
    },
  },
  {
    eventType: "task_queued",
    parse: (base, payload) => {
      const parsed = taskQueuedEventListItem.safeParse({ ...base, payload });
      return parsed.success ? parsed.data : null;
    },
  },
  {
    eventType: "run_started",
    parse: (base, payload) => {
      const parsed = runStartedEventListItem.safeParse({ ...base, payload });
      return parsed.success ? parsed.data : null;
    },
  },
  {
    eventType: "repository_registered",
    parse: (base, payload) => {
      const parsed = repositoryRegisteredEventListItem.safeParse({
        ...base,
        payload,
      });
      return parsed.success ? parsed.data : null;
    },
  },
  {
    eventType: "agent_created",
    parse: (base, payload) => {
      const parsed = agentCreatedEventListItem.safeParse({ ...base, payload });
      return parsed.success ? parsed.data : null;
    },
  },
  {
    eventType: "subscription_upserted",
    parse: (base, payload) => {
      const parsed = subscriptionUpsertedEventListItem.safeParse({
        ...base,
        payload,
      });
      return parsed.success ? parsed.data : null;
    },
  },
  {
    eventType: "rule_created",
    parse: (base, payload) => {
      const parsed = ruleCreatedEventListItem.safeParse({ ...base, payload });
      return parsed.success ? parsed.data : null;
    },
  },
];

type EventListItemBase = {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  actorId: string;
  createdAt: string;
  version: number;
};

export function toEventListItem(row: EventDto): EventListItem {
  const base: EventListItemBase = {
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    eventType: row.eventType,
    actorId: row.actorId,
    createdAt: row.createdAt,
    version: row.version,
  };

  for (const parser of eventParsers) {
    if (parser.eventType === row.eventType) {
      const parsed = parser.parse(base, row.payload);
      if (parsed) {
        return parsed;
      }
    }
  }

  getLogger().warn(
    {
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
    },
    "Event payload returned as unknown fallback (no domain schema registered)",
  );

  return {
    ...base,
    payload: null,
  };
}
