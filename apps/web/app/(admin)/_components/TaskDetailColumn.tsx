"use client";

import type {
  AgentProjectionDto,
  TaskProjectionDto,
} from "@new-cursor/orpc-contract";
import { TabPanel, Tabs } from "@new-cursor/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { useId, useState } from "react";

import { orpcBrowser } from "@/lib/orpc/client.browser";

import { DETAIL_HISTORY_TAB_ITEMS, type DetailHistoryTab } from "./drawer-tabs";
import { EventHistoryTab } from "./EventHistoryTab";
import { PredictedEventFlow } from "./PredictedEventFlow";
import { TaskStageIcon } from "./TaskStageIcon";
import { buildUnifiedTimeline } from "./task-detail-helpers";
import {
  DecisionList,
  StagePipelineStepper,
  UnifiedTimeline,
} from "./task-detail-visuals";
import { TASK_EVENT_FORMATTERS } from "./task-event-formatters";

type Props = {
  repositoriesById: Record<string, string>;
};

export function TaskDetailColumn({ repositoriesById }: Props) {
  const [selectedId, setSelectedId] = useQueryState("id", parseAsString);
  const [tab, setTab] = useState<DetailHistoryTab>("detail");
  const tabsId = useId();

  const taskQuery = useQuery({
    queryKey: ["tasks.get", selectedId],
    queryFn: () => orpcBrowser.tasks.get({ id: selectedId! }),
    enabled: Boolean(selectedId),
  });

  if (!selectedId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        左のリストからタスクを選択してください
      </div>
    );
  }

  if (taskQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        タスク詳細を読み込み中...
      </div>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        タスク詳細の取得に失敗しました
      </div>
    );
  }

  const task = taskQuery.data;
  const repoName = repoLabel(task, repositoriesById);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">{task.title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <TaskStageIcon stage={task.stage} />
          <span>{repoName}</span>
          {task.branchName ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono">{task.branchName}</span>
            </>
          ) : null}
        </div>
      </div>
      <Tabs
        idBase={tabsId}
        items={DETAIL_HISTORY_TAB_ITEMS}
        value={tab}
        onChange={setTab}
        ariaLabel="タスク詳細タブ"
        className="px-4"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <TabPanel idBase={tabsId} activeTabId={tab}>
          {tab === "detail" ? (
            <TaskDetailPanel
              task={task}
              onSelectChildTask={(id) => void setSelectedId(id)}
            />
          ) : (
            <EventHistoryTab
              aggregateType="task"
              aggregateId={task.id}
              formatters={TASK_EVENT_FORMATTERS}
            />
          )}
        </TabPanel>
      </div>
    </div>
  );
}

function TaskDetailPanel({
  task,
  onSelectChildTask,
}: {
  task: TaskProjectionDto;
  onSelectChildTask: (taskId: string) => void;
}) {
  const eventsQuery = useQuery({
    queryKey: ["events.listByAggregate", "task", task.id],
    queryFn: () =>
      orpcBrowser.events.listByAggregate({
        aggregateType: "task",
        aggregateId: task.id,
      }),
  });

  const runsQuery = useQuery({
    queryKey: ["runs.list", task.id],
    queryFn: () =>
      orpcBrowser.runs.list({
        filters: { taskId: task.id },
        limit: 50,
      }),
  });

  const childrenQuery = useQuery({
    queryKey: ["tasks.list", "children", task.id],
    queryFn: () =>
      orpcBrowser.tasks.list({
        filters: { parentTaskId: task.id },
        sort: { field: "createdAt", direction: "asc" },
        limit: 50,
      }),
  });

  const agentsQuery = useQuery({
    queryKey: ["agents.list"],
    queryFn: () => orpcBrowser.agents.list({ limit: 100 }),
  });

  const decisionsQuery = useQuery({
    queryKey: ["decisions.listByTask", task.id],
    queryFn: () => orpcBrowser.decisions.listByTask({ taskId: task.id }),
  });

  const events = eventsQuery.data?.events ?? [];
  const runs = runsQuery.data?.rows ?? [];
  const childTasks = childrenQuery.data?.rows ?? [];
  const agentsById = indexAgents(agentsQuery.data?.rows ?? []);
  const decisions = decisionsQuery.data?.rows ?? [];
  const timelineEntries = buildUnifiedTimeline(
    task,
    events,
    runs,
    agentsById,
    childTasks,
  );
  const timelineLoading =
    eventsQuery.isLoading ||
    runsQuery.isLoading ||
    childrenQuery.isLoading ||
    agentsQuery.isLoading;
  const timelineError =
    eventsQuery.isError ||
    runsQuery.isError ||
    childrenQuery.isError ||
    agentsQuery.isError;

  return (
    <div className="space-y-3">
      <StagePipelineStepper stage={task.stage} />

      {task.stage === "waiting" ? <TaskApproveButton taskId={task.id} /> : null}

      <CompactBlock title="背景・検証">
        <div className="space-y-1">
          <TaskContentField
            label="背景・目的"
            emptyMessage="背景・目的はまだ記録されていません。"
          >
            {task.background?.trim() ? (
              <p className="whitespace-pre-wrap text-foreground">
                {task.background}
              </p>
            ) : null}
          </TaskContentField>
          <TaskContentField
            label="検証項目"
            emptyMessage="検証項目はまだ記録されていません。"
          >
            {task.verificationItems?.trim() ? (
              <VerificationItemsList items={task.verificationItems} />
            ) : null}
          </TaskContentField>
        </div>
      </CompactBlock>

      <CompactBlock title="意思決定">
        {decisionsQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">読み込み中...</p>
        ) : decisionsQuery.isError ? (
          <p className="text-xs text-destructive">
            意思決定の取得に失敗しました
          </p>
        ) : (
          <DecisionList decisions={decisions} agentsById={agentsById} />
        )}
      </CompactBlock>

      <section className="space-y-1.5">
        <header className="flex items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-medium text-muted-foreground">
            タイムライン
          </h3>
          {timelineEntries.length > 0 ? (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {timelineEntries.length} 件
            </span>
          ) : null}
        </header>
        {timelineLoading ? (
          <p className="text-xs text-muted-foreground">読み込み中...</p>
        ) : timelineError ? (
          <p className="text-xs text-destructive">
            タイムラインの取得に失敗しました
          </p>
        ) : (
          <UnifiedTimeline
            entries={timelineEntries}
            onSelectChildTask={onSelectChildTask}
          />
        )}
      </section>

      <section className="space-y-1.5">
        <header>
          <h3 className="text-[11px] font-medium text-muted-foreground">
            予想イベント分岐
          </h3>
          <p className="text-[10px] text-muted-foreground/80">
            現在の工程から想定されるイベント経路（破線は未実装）
          </p>
        </header>
        <PredictedEventFlow
          task={task}
          events={events}
          runs={runs.map((run) => ({ status: run.status }))}
        />
      </section>
    </div>
  );
}

function TaskContentField({
  label,
  emptyMessage,
  children,
}: {
  label: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-xs leading-snug">
      <span className="font-medium text-muted-foreground">{label}: </span>
      {children ?? (
        <span className="text-muted-foreground">{emptyMessage}</span>
      )}
    </div>
  );
}

function VerificationItemsList({ items }: { items: string }) {
  const lines = items
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return <span className="whitespace-pre-wrap text-foreground">{items}</span>;
  }

  return (
    <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-foreground">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function CompactBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
      <h3 className="mb-1 text-[10px] font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function indexAgents(
  agents: AgentProjectionDto[],
): Record<string, AgentProjectionDto> {
  return Object.fromEntries(agents.map((agent) => [agent.id, agent]));
}

function repoLabel(
  task: TaskProjectionDto,
  repositoriesById: Record<string, string>,
): string {
  if (!task.repositoryId) return "（リポジトリ未設定）";
  return repositoriesById[task.repositoryId] ?? task.repositoryId;
}

function TaskApproveButton({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: () => orpcBrowser.tasks.approve({ id: taskId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks.get", taskId] });
      await queryClient.invalidateQueries({
        queryKey: ["events.listByAggregate", "task", taskId],
      });
    },
  });

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2">
      <p className="mb-2 text-xs text-muted-foreground">
        PR の内容を確認し、問題なければ承認してください。
      </p>
      <button
        type="button"
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
        disabled={approveMutation.isPending}
        onClick={() => approveMutation.mutate()}
      >
        {approveMutation.isPending ? "承認中..." : "承認"}
      </button>
      {approveMutation.isError ? (
        <p className="mt-2 text-xs text-destructive">承認に失敗しました</p>
      ) : null}
    </div>
  );
}
