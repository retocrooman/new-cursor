import type {
  AgentProjectionDto,
  EventListItem,
  RunProjectionDto,
  TaskProjectionDto,
} from "@new-cursor/orpc-contract";

import { TASK_STAGE_LABELS } from "./task-event-formatters";

export const TASK_STAGE_ORDER = [
  "created",
  "worktree_requested",
  "worktree_ready",
  "queued",
  "implementing",
  "verifying",
  "waiting",
  "completed",
] as const satisfies readonly TaskProjectionDto["stage"][];

export type TaskStage = (typeof TASK_STAGE_ORDER)[number];

export type CompletionCriterionStatus = "met" | "current" | "pending";

export type CompletionCriterion = {
  id: string;
  label: string;
  status: CompletionCriterionStatus;
  detail?: string;
};

export type EventActivityBucket = {
  label: string;
  count: number;
};

export type TimelineEntry =
  | {
      kind: "event";
      id: string;
      timestamp: string;
      event: EventListItem;
      agent?: AgentProjectionDto;
    }
  | {
      kind: "run";
      id: string;
      timestamp: string;
      run: RunProjectionDto;
      agent?: AgentProjectionDto;
    }
  | {
      kind: "child_task";
      id: string;
      timestamp: string;
      child: TaskProjectionDto;
    };

const RUN_EVENT_TYPES = new Set(["run_started", "run_completed"]);

const STAGE_INDEX = Object.fromEntries(
  TASK_STAGE_ORDER.map((stage, index) => [stage, index]),
) as Record<TaskStage, number>;

export function stageIndex(stage: string): number {
  return STAGE_INDEX[stage as TaskStage] ?? 0;
}

export function stageProgressPercent(stage: string): number {
  const index = stageIndex(stage);
  const max = TASK_STAGE_ORDER.length - 1;
  return Math.round((index / max) * 100);
}

export function deriveCompletionCriteria(
  task: Pick<TaskProjectionDto, "stage" | "background" | "verificationItems">,
  events: Pick<EventListItem, "eventType">[],
): CompletionCriterion[] {
  const hasEvent = (eventType: string) =>
    events.some((event) => event.eventType === eventType);
  const idx = stageIndex(task.stage);

  const pipeline: CompletionCriterion[] = [
    {
      id: "task_created",
      label: "タスク起票",
      status: criterionStatus(idx, 0, hasEvent("task_created")),
      detail: "司令官チャットで起票・確認完了",
    },
    {
      id: "worktree_ready",
      label: "worktree 準備完了",
      status: criterionStatus(idx, 2, hasEvent("task_worktree_ready")),
      detail: TASK_STAGE_LABELS.worktree_ready,
    },
    {
      id: "implementation",
      label: "実装完了",
      status: criterionStatus(idx, 5, idx >= 6),
      detail: "エージェント実行が完了し verifying へ遷移",
    },
    {
      id: "approval",
      label: "承認完了",
      status: criterionStatus(idx, 7, task.stage === "completed"),
      detail: "PR 承認後に completed",
    },
  ];

  const verification: CompletionCriterion[] = [
    {
      id: "background",
      label: "背景・目的の確認",
      status: task.background?.trim() ? "met" : "pending",
      detail: task.background?.trim() ?? "起票時に司令官が確認",
    },
    {
      id: "verification_items",
      label: "検証項目の確認",
      status: task.verificationItems?.trim() ? "met" : "pending",
      detail: task.verificationItems?.trim() ?? "起票時に司令官が確認",
    },
  ];

  return [...pipeline, ...verification];
}

function criterionStatus(
  currentIndex: number,
  targetIndex: number,
  eventMet: boolean,
): CompletionCriterionStatus {
  if (eventMet || currentIndex > targetIndex) return "met";
  if (currentIndex === targetIndex) return "current";
  return "pending";
}

export function bucketEventsByTime(
  events: Pick<EventListItem, "createdAt">[],
  maxBuckets = 12,
): EventActivityBucket[] {
  if (events.length === 0) return [];

  const timestamps = events.map((event) => new Date(event.createdAt).getTime());
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const span = Math.max(max - min, 1);
  const bucketMs = span / maxBuckets;

  const counts = Array.from({ length: maxBuckets }, () => 0);
  for (const ts of timestamps) {
    const index = Math.min(Math.floor((ts - min) / bucketMs), maxBuckets - 1);
    counts[index] = (counts[index] ?? 0) + 1;
  }

  return counts.map((count, index) => ({
    label: String(index + 1),
    count,
  }));
}

export function countEventsByType(
  events: Pick<EventListItem, "eventType">[],
): { eventType: string; count: number }[] {
  const tally = new Map<string, number>();
  for (const event of events) {
    tally.set(event.eventType, (tally.get(event.eventType) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatRunTokenCount(run: RunProjectionDto): string {
  const tokens = (run as RunProjectionDto & { tokenCount?: number | null })
    .tokenCount;
  if (tokens == null || Number.isNaN(tokens)) return "—";
  return tokens.toLocaleString("ja-JP");
}

export function formatRunDuration(
  createdAt: string,
  updatedAt: string,
  status: "running" | "completed" | "error",
): string {
  if (status === "running") return "実行中";

  const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  if (ms < 1000) return "1秒未満";

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}分${remainingSeconds}秒`
      : `${minutes}分`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}時間${remainingMinutes}分`
    : `${hours}時間`;
}

export function buildUnifiedTimeline(
  _task: Pick<TaskProjectionDto, "id">,
  events: EventListItem[],
  runs: RunProjectionDto[],
  agentsById: Record<string, AgentProjectionDto>,
  childTasks: TaskProjectionDto[] = [],
): TimelineEntry[] {
  const taskEvents = events.filter(
    (event) => !RUN_EVENT_TYPES.has(event.eventType),
  );

  const entries: TimelineEntry[] = [
    ...taskEvents.map((event) => {
      const agentId = agentIdFromEventPayload(event.payload);
      return {
        kind: "event" as const,
        id: `event-${event.aggregateId}-${event.version}`,
        timestamp: event.createdAt,
        event,
        agent: agentId ? agentsById[agentId] : undefined,
      };
    }),
    ...runs.map((run) => ({
      kind: "run" as const,
      id: `run-${run.id}`,
      timestamp: run.createdAt,
      run,
      agent: agentsById[run.agentId],
    })),
    ...childTasks.map((child) => ({
      kind: "child_task" as const,
      id: `child-${child.id}`,
      timestamp: child.createdAt,
      child,
    })),
  ];

  return entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

function agentIdFromEventPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("agentId" in payload)) {
    return undefined;
  }

  const agentId = payload.agentId;
  return typeof agentId === "string" ? agentId : undefined;
}

export type FlowNodeStatus = "past" | "current" | "predicted" | "future";

export type PredictedFlowNode = {
  id: string;
  label: string;
  status: FlowNodeStatus;
  eventType: string;
  row: number;
  col: number;
};

export type PredictedFlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  style: "solid" | "dashed";
};

export type PredictedEventFlowGraph = {
  nodes: PredictedFlowNode[];
  edges: PredictedFlowEdge[];
};

/** row = vertical step (top → bottom), col = horizontal branch lane (center = 1). */
const FLOW_NODE_LAYOUT: Record<
  string,
  { label: string; eventType: string; row: number; col: number }
> = {
  task_created: {
    label: "起票",
    eventType: "task_created",
    row: 0,
    col: 1,
  },
  worktree_requested: {
    label: "worktree 要求",
    eventType: "task_stage_changed",
    row: 1,
    col: 1,
  },
  worktree_ready: {
    label: "worktree 準備",
    eventType: "task_worktree_ready",
    row: 2,
    col: 1,
  },
  task_queued: {
    label: "キュー待ち",
    eventType: "task_queued",
    row: 2,
    col: 0,
  },
  run_started: {
    label: "実行開始",
    eventType: "run_started",
    row: 3,
    col: 1,
  },
  run_completed_ok: {
    label: "実行成功",
    eventType: "run_completed",
    row: 4,
    col: 1,
  },
  run_completed_error: {
    label: "実行エラー",
    eventType: "run_completed",
    row: 4,
    col: 2,
  },
  stage_completed: {
    label: "実装工程完了",
    eventType: "task_stage_changed",
    row: 5,
    col: 1,
  },
  approval_requested: {
    label: "承認依頼",
    eventType: "approval_requested",
    row: 9,
    col: 1,
  },
  task_pr_requested: {
    label: "PR 作成依頼",
    eventType: "task_pr_requested",
    row: 6,
    col: 1,
  },
  task_pr_created: {
    label: "PR 作成",
    eventType: "task_pr_created",
    row: 7,
    col: 1,
  },
  ci_completed: {
    label: "CI 結果",
    eventType: "ci_completed",
    row: 8,
    col: 1,
  },
  approval_granted: {
    label: "承認",
    eventType: "approval_granted",
    row: 10,
    col: 1,
  },
  pr_merged: {
    label: "PR マージ",
    eventType: "pr_merged",
    row: 11,
    col: 1,
  },
  task_completed: {
    label: "タスク完了",
    eventType: "task_completed",
    row: 12,
    col: 1,
  },
};

const MVP_FLOW_EDGES: Omit<PredictedFlowEdge, "id">[] = [
  { from: "task_created", to: "worktree_requested", style: "solid" },
  {
    from: "worktree_requested",
    to: "worktree_ready",
    label: "競合なし",
    style: "solid",
  },
  {
    from: "worktree_requested",
    to: "task_queued",
    label: "競合あり",
    style: "solid",
  },
  {
    from: "task_queued",
    to: "worktree_requested",
    label: "解放",
    style: "solid",
  },
  { from: "worktree_ready", to: "run_started", style: "solid" },
  {
    from: "run_started",
    to: "run_completed_ok",
    label: "成功",
    style: "solid",
  },
  {
    from: "run_started",
    to: "run_completed_error",
    label: "失敗",
    style: "solid",
  },
  { from: "run_completed_ok", to: "stage_completed", style: "solid" },
  { from: "stage_completed", to: "task_pr_requested", style: "solid" },
  { from: "task_pr_requested", to: "task_pr_created", style: "solid" },
  { from: "task_pr_created", to: "approval_requested", style: "solid" },
  { from: "approval_requested", to: "approval_granted", style: "solid" },
  { from: "approval_granted", to: "task_completed", style: "solid" },
];

const FUTURE_FLOW_EDGES: Omit<PredictedFlowEdge, "id">[] = [
  { from: "task_pr_created", to: "ci_completed", style: "dashed" },
  { from: "ci_completed", to: "approval_granted", style: "dashed" },
  { from: "approval_granted", to: "pr_merged", style: "dashed" },
  { from: "pr_merged", to: "task_completed", style: "dashed" },
];

const STAGE_CURRENT_NODE: Partial<Record<TaskStage, string>> = {
  created: "task_created",
  worktree_requested: "worktree_requested",
  worktree_ready: "worktree_ready",
  queued: "task_queued",
  implementing: "run_started",
  verifying: "task_pr_requested",
  waiting: "approval_requested",
  completed: "task_completed",
};

export function buildPredictedEventFlow(
  task: Pick<TaskProjectionDto, "stage">,
  events: Pick<EventListItem, "eventType">[],
  runs: Pick<RunProjectionDto, "status">[] = [],
): PredictedEventFlowGraph {
  const hasEvent = (eventType: string) =>
    events.some((event) => event.eventType === eventType);
  const stage = task.stage as TaskStage;
  const idx = stageIndex(stage);
  const hasRun = runs.length > 0;
  const hasRunError = runs.some((run) => run.status === "error");
  const hasRunSuccess = runs.some((run) => run.status === "completed");
  const hasRunRunning = runs.some((run) => run.status === "running");

  const nodeStatus = (id: string): FlowNodeStatus => {
    const currentId = STAGE_CURRENT_NODE[stage];

    if (
      stage === "implementing" &&
      hasRunError &&
      !hasRunRunning &&
      id === "run_completed_error"
    ) {
      return "current";
    }

    if (id === currentId) {
      if (stage === "implementing" && hasRunError && !hasRunRunning) {
        return "past";
      }
      if (stage === "implementing" && hasRunRunning) return "current";
      return "current";
    }

    const pastByStage: Record<string, boolean> = {
      task_created: hasEvent("task_created") || idx > 0,
      worktree_requested: idx >= 1 || hasEvent("task_stage_changed"),
      worktree_ready:
        hasEvent("task_worktree_ready") || idx >= 2 || stage === "queued",
      task_queued: hasEvent("task_queued") || stage === "queued",
      run_started: hasRun || idx >= 4,
      run_completed_ok: hasRunSuccess || idx >= 5,
      run_completed_error: hasRunError,
      stage_completed: idx >= 5 || hasEvent("task_pr_requested"),
      task_pr_requested: hasEvent("task_pr_requested") || idx >= 6,
      task_pr_created: hasEvent("task_pr_created") || idx >= 7,
      approval_requested: hasEvent("approval_requested") || idx >= 7,
      approval_granted: hasEvent("approval_granted") || stage === "completed",
      task_completed: hasEvent("task_completed") || stage === "completed",
    };

    if (pastByStage[id]) return "past";

    const futureIds = new Set(["ci_completed", "pr_merged"]);
    if (futureIds.has(id)) return "future";

    if (stage === "completed" && id === "task_completed") return "current";

    return "predicted";
  };

  const nodes: PredictedFlowNode[] = Object.entries(FLOW_NODE_LAYOUT).map(
    ([id, layout]) => ({
      id,
      label: layout.label,
      eventType: layout.eventType,
      row: layout.row,
      col: layout.col,
      status: nodeStatus(id),
    }),
  );

  const edges: PredictedFlowEdge[] = [
    ...MVP_FLOW_EDGES,
    ...FUTURE_FLOW_EDGES,
  ].map((edge, index) => ({
    id: `edge-${index}`,
    ...edge,
  }));

  return { nodes, edges };
}
