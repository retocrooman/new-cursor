export const TASK_AGGREGATE = "task" as const;

export const EVENT_AGGREGATE_TYPES = [TASK_AGGREGATE] as const;
export type EventAggregateType = (typeof EVENT_AGGREGATE_TYPES)[number];
