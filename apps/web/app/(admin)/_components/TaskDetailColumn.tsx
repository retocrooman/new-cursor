"use client";

import type { TaskProjectionDto } from "@new-cursor/orpc-contract";
import { Badge, TabPanel, Tabs } from "@new-cursor/ui";
import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { useId, useState } from "react";

import { orpcBrowser } from "@/lib/orpc/client.browser";

import { DETAIL_HISTORY_TAB_ITEMS, type DetailHistoryTab } from "./drawer-tabs";
import { EventHistoryTab } from "./EventHistoryTab";
import {
  TASK_EVENT_FORMATTERS,
  TASK_STAGE_LABELS,
} from "./task-event-formatters";

type Props = {
  repositoriesById: Record<string, string>;
};

export function TaskDetailColumn({ repositoriesById }: Props) {
  const [selectedId] = useQueryState("id", parseAsString);
  const [tab, setTab] = useState<DetailHistoryTab>("detail");
  const tabsId = useId();

  const taskQuery = useQuery({
    queryKey: ["tasks.get", selectedId],
    queryFn: () => orpcBrowser.tasks.get({ id: selectedId! }),
    enabled: Boolean(selectedId),
  });

  if (!selectedId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-zinc-500">
        左のリストからタスクを選択してください
      </div>
    );
  }

  if (taskQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-zinc-500">タスク詳細を読み込み中...</div>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <div className="p-6 text-sm text-red-600">
        タスク詳細の取得に失敗しました
      </div>
    );
  }

  const task = taskQuery.data;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-900">{task.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <Badge tone="zinc">
            {TASK_STAGE_LABELS[task.stage] ?? task.stage}
          </Badge>
          <span>{repoLabel(task, repositoriesById)}</span>
          {task.branchName ? <span>branch: {task.branchName}</span> : null}
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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <TabPanel idBase={tabsId} activeTabId={tab}>
          {tab === "detail" ? (
            <TaskDetailPanel task={task} />
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

function TaskDetailPanel({ task }: { task: TaskProjectionDto }) {
  return (
    <dl className="space-y-3 text-sm">
      <DetailRow label="ID" value={task.id} />
      <DetailRow
        label="ステージ"
        value={TASK_STAGE_LABELS[task.stage] ?? task.stage}
      />
      <DetailRow label="ブランチ" value={task.branchName ?? "—"} />
      <DetailRow label="worktree" value={task.worktreePath ?? "—"} />
      <DetailRow label="作成" value={task.createdAt} />
      <DetailRow label="更新" value={task.updatedAt} />
    </dl>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-0.5 break-all text-zinc-900">{value}</dd>
    </div>
  );
}

function repoLabel(
  task: TaskProjectionDto,
  repositoriesById: Record<string, string>,
): string {
  if (!task.repositoryId) return "（リポジトリ未設定）";
  return repositoriesById[task.repositoryId] ?? task.repositoryId;
}
