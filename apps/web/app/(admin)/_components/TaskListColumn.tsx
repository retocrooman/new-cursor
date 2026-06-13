"use client";

import type { TaskProjectionDto } from "@new-cursor/orpc-contract";
import { Badge } from "@new-cursor/ui";
import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";

import { orpcBrowser } from "@/lib/orpc/client.browser";

import { TASK_STAGE_LABELS } from "./task-event-formatters";

type Props = {
  repositoriesById: Record<string, string>;
};

export function TaskListColumn({ repositoriesById }: Props) {
  const [selectedId, setSelectedId] = useQueryState(
    "id",
    parseAsString.withOptions({ shallow: true }),
  );

  const tasksQuery = useQuery({
    queryKey: ["tasks.list"],
    queryFn: () =>
      orpcBrowser.tasks.list({
        sort: { field: "updatedAt", direction: "desc" },
        limit: 50,
      }),
  });

  if (tasksQuery.isLoading) {
    return (
      <div className="p-4 text-xs text-zinc-500">タスクを読み込み中...</div>
    );
  }

  if (tasksQuery.isError) {
    return (
      <div className="p-4 text-xs text-red-600">タスクの取得に失敗しました</div>
    );
  }

  const tasks = tasksQuery.data?.rows ?? [];

  if (tasks.length === 0) {
    return <div className="p-4 text-xs text-zinc-500">タスクがありません</div>;
  }

  return (
    <ul className="divide-y divide-zinc-200">
      {tasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          repoName={repoLabel(task, repositoriesById)}
          isSelected={selectedId === task.id}
          onSelect={() => void setSelectedId(task.id)}
        />
      ))}
    </ul>
  );
}

function TaskListItem({
  task,
  repoName,
  isSelected,
  onSelect,
}: {
  task: TaskProjectionDto;
  repoName: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const lastEventQuery = useQuery({
    queryKey: ["events.last", task.id],
    queryFn: async () => {
      const result = await orpcBrowser.events.listByAggregate({
        aggregateType: "task",
        aggregateId: task.id,
      });
      const events = result.events;
      return events.length > 0 ? events[events.length - 1] : null;
    },
  });

  const lastEventLabel = lastEventQuery.data?.eventType ?? "—";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={
          isSelected
            ? "w-full px-3 py-3 text-left bg-indigo-50 hover:bg-indigo-100"
            : "w-full px-3 py-3 text-left hover:bg-zinc-50"
        }
      >
        <div className="truncate text-sm font-medium text-zinc-900">
          {task.title}
        </div>
        <div className="mt-1 truncate text-xs text-zinc-500">{repoName}</div>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone="zinc">
            {TASK_STAGE_LABELS[task.stage] ?? task.stage}
          </Badge>
          <span className="truncate text-[11px] text-zinc-500">
            {lastEventLabel}
          </span>
        </div>
      </button>
    </li>
  );
}

function repoLabel(
  task: TaskProjectionDto,
  repositoriesById: Record<string, string>,
): string {
  if (!task.repositoryId) return "（リポジトリ未設定）";
  return repositoriesById[task.repositoryId] ?? task.repositoryId;
}
