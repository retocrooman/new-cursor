import type { EventIcon } from "@new-cursor/events";
import type {
  AgentProjectionDto,
  EventListItem,
  RunProjectionDto,
  TaskDecisionProjectionDto,
  TaskProjectionDto,
} from "@new-cursor/orpc-contract";
import { AGENT_MODEL_OPTIONS } from "@new-cursor/orpc-contract";
import { Badge, type BadgeTone } from "@new-cursor/ui";

import { formatTimestamp } from "@/lib/format/datetime";
import { TaskStageIcon } from "./TaskStageIcon";
import {
  formatRunDuration,
  formatRunTokenCount,
  stageProgressPercent,
  TASK_STAGE_ORDER,
  type TaskStage,
  type TimelineEntry,
} from "./task-detail-helpers";
import { formatTaskEvent, TASK_STAGE_LABELS } from "./task-event-formatters";

const ICON_LABEL: Record<EventIcon, string> = {
  create: "新規",
  update: "編集",
  delete: "削除",
  restore: "復元",
  transition: "遷移",
  system: "システム",
};

const ICON_TONE: Record<EventIcon, BadgeTone> = {
  create: "emerald",
  update: "indigo",
  delete: "red",
  restore: "amber",
  transition: "cyan",
  system: "zinc",
};

type StagePipelineStepperProps = {
  stage: TaskProjectionDto["stage"];
};

export function StagePipelineStepper({ stage }: StagePipelineStepperProps) {
  const currentIndex = TASK_STAGE_ORDER.indexOf(stage as TaskStage);
  const progress = stageProgressPercent(stage);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>工程パイプライン</span>
        <span className="tabular-nums">{progress}%</span>
      </div>
      <div
        className="relative h-1 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="タスク工程の進捗"
      >
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="grid grid-cols-3 gap-x-1 gap-y-1.5 sm:grid-cols-6">
        {TASK_STAGE_ORDER.map((step, index) => {
          const state =
            index < currentIndex
              ? "done"
              : index === currentIndex
                ? "current"
                : "upcoming";
          const label = TASK_STAGE_LABELS[step] ?? step;

          return (
            <li key={step} className="flex flex-col items-center gap-0.5">
              <div
                className={[
                  "flex size-5 items-center justify-center rounded-full border text-[9px] font-semibold transition-colors",
                  state === "done"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : state === "current"
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-muted/50 text-muted-foreground",
                ].join(" ")}
                title={label}
              >
                {state === "done" ? "✓" : index + 1}
              </div>
              <span
                className={[
                  "max-w-full truncate text-center text-[9px] leading-none",
                  state === "current"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type DecisionListProps = {
  decisions: TaskDecisionProjectionDto[];
  agentsById: Record<string, AgentProjectionDto>;
};

export function DecisionList({ decisions, agentsById }: DecisionListProps) {
  if (decisions.length === 0) {
    return (
      <p className="text-xs leading-snug text-muted-foreground">
        エージェントが判断に迷った重要な意思決定や、ユーザーへの質問とその回答がここに記録されます。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {decisions.map((decision) => (
        <li key={decision.id} className="space-y-0.5">
          <DecisionRecordRow decision={decision} agentsById={agentsById} />
        </li>
      ))}
    </ul>
  );
}

function DecisionRecordRow({
  decision,
  agentsById,
}: {
  decision: TaskDecisionProjectionDto;
  agentsById: Record<string, AgentProjectionDto>;
}) {
  const agentName = decision.agentId
    ? (agentsById[decision.agentId]?.name ?? decision.agentId)
    : null;

  return (
    <div className="rounded-sm border border-border/60 bg-background/40 px-2 py-1.5">
      <p className="text-[11px] leading-snug text-foreground">
        {decision.summary}
      </p>
      {decision.context?.trim() ? (
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          {decision.context}
        </p>
      ) : null}
      {decision.userResponse?.trim() ? (
        <p className="mt-0.5 text-[10px] leading-snug text-foreground/90">
          <span className="text-muted-foreground">回答: </span>
          {decision.userResponse}
        </p>
      ) : null}
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] text-muted-foreground">
        {agentName ? (
          <>
            <span className="truncate text-foreground">{agentName}</span>
            <span aria-hidden>·</span>
          </>
        ) : null}
        <time dateTime={decision.createdAt} className="tabular-nums">
          {formatTimestamp(decision.createdAt)}
        </time>
      </div>
    </div>
  );
}

type UnifiedTimelineProps = {
  entries: TimelineEntry[];
  onSelectChildTask?: (taskId: string) => void;
};

export function UnifiedTimeline({
  entries,
  onSelectChildTask,
}: UnifiedTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
        タイムラインに表示する項目はまだありません。
      </p>
    );
  }

  const ordered = [...entries].reverse();

  return (
    <ol className="relative space-y-0 border-l border-border pl-3">
      {ordered.map((entry) => (
        <li key={entry.id} className="pb-2">
          <span
            className="absolute -left-[4px] mt-1 size-2 rounded-full border-2 border-background bg-accent"
            aria-hidden
          />
          {entry.kind === "event" ? (
            <TimelineEventRow event={entry.event} agent={entry.agent} />
          ) : entry.kind === "run" ? (
            <TimelineRunRow run={entry.run} agent={entry.agent} />
          ) : (
            <TimelineChildTaskRow
              child={entry.child}
              onSelect={onSelectChildTask}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function TimelineEventRow({
  event,
  agent,
}: {
  event: EventListItem;
  agent?: AgentProjectionDto;
}) {
  const formatted = formatTaskEvent(event);

  return (
    <div className="flex items-start gap-1.5">
      <Badge
        tone={ICON_TONE[formatted.icon]}
        className="shrink-0 text-[9px] px-1 py-0"
      >
        {ICON_LABEL[formatted.icon]}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-snug text-foreground">
          {formatted.title}
        </p>
        {agent ? (
          <TimelineAgentMeta
            agentName={agent.name}
            tokenCount="—"
            suffix={agentModelLabel(agent.modelId)}
          />
        ) : null}
        <time
          dateTime={event.createdAt}
          className="text-[10px] tabular-nums text-muted-foreground"
        >
          {formatTimestamp(event.createdAt)}
        </time>
      </div>
    </div>
  );
}

function TimelineRunRow({
  run,
  agent,
}: {
  run: RunProjectionDto;
  agent?: AgentProjectionDto;
}) {
  const duration = formatRunDuration(run.createdAt, run.updatedAt, run.status);
  const agentName = agent?.name ?? run.agentId;
  const tokenCount = formatRunTokenCount(run);

  return (
    <div className="flex items-start gap-1.5">
      <Badge tone="cyan" className="shrink-0 text-[9px] px-1 py-0">
        実行
      </Badge>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs text-foreground">エージェント実行</p>
          <Badge
            tone={RUN_STATUS_TONE[run.status]}
            className="text-[9px] px-1 py-0"
          >
            {RUN_STATUS_LABEL[run.status]}
          </Badge>
        </div>
        <TimelineAgentMeta
          agentName={agentName}
          tokenCount={tokenCount}
          suffix={duration}
        />
        <time
          dateTime={run.createdAt}
          className="text-[10px] tabular-nums text-muted-foreground"
        >
          {formatTimestamp(run.createdAt)}
        </time>
      </div>
    </div>
  );
}

function TimelineAgentMeta({
  agentName,
  tokenCount,
  suffix,
}: {
  agentName: string;
  tokenCount: string;
  suffix?: string;
}) {
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] text-muted-foreground">
      <span className="truncate text-foreground">{agentName}</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">
        トークン <span className="text-foreground">{tokenCount}</span>
      </span>
      {suffix ? (
        <>
          <span aria-hidden>·</span>
          <span className="tabular-nums text-foreground">{suffix}</span>
        </>
      ) : null}
    </p>
  );
}

function TimelineChildTaskRow({
  child,
  onSelect,
}: {
  child: TaskProjectionDto;
  onSelect?: (taskId: string) => void;
}) {
  const title = child.title;

  return (
    <div className="flex items-start gap-1.5">
      <Badge tone="emerald" className="shrink-0 text-[9px] px-1 py-0">
        子タスク
      </Badge>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs text-foreground">子タスク起票: {title}</p>
          <TaskStageIcon stage={child.stage} />
        </div>
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(child.id)}
            className="mt-0.5 text-[10px] text-accent hover:underline"
          >
            子タスクを開く
          </button>
        ) : null}
        <time
          dateTime={child.createdAt}
          className="text-[10px] tabular-nums text-muted-foreground"
        >
          {formatTimestamp(child.createdAt)}
        </time>
      </div>
    </div>
  );
}

const RUN_STATUS_LABEL: Record<RunProjectionDto["status"], string> = {
  running: "実行中",
  completed: "完了",
  error: "エラー",
};

const RUN_STATUS_TONE: Record<RunProjectionDto["status"], BadgeTone> = {
  running: "indigo",
  completed: "emerald",
  error: "red",
};

function agentModelLabel(modelId: string | null | undefined): string {
  if (!modelId) return "未設定";
  return (
    AGENT_MODEL_OPTIONS.find((option) => option.id === modelId)?.label ??
    modelId
  );
}
