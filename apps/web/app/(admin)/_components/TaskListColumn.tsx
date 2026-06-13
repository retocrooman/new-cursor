"use client";

import type { TaskProjectionDto } from "@new-cursor/orpc-contract";
import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";

import { orpcBrowser } from "@/lib/orpc/client.browser";

import { TaskStageIcon } from "./TaskStageIcon";

type Props = {
  repositoriesById: Record<string, string>;
};

export function TaskListColumn({ repositoriesById }: Props) {
  const [selectedId, setSelectedId] = useQueryState(
    "id",
    parseAsString.withOptions({ shallow: true }),
  );

  const tasksQuery = useQuery({
    queryKey: ["tasks.list", "roots"],
    queryFn: () =>
      orpcBrowser.tasks.list({
        filters: { parentTaskId: null },
        sort: { field: "updatedAt", direction: "desc" },
        limit: 50,
      }),
  });

  if (tasksQuery.isLoading) {
    return (
      <div className="p-3 text-[11px] text-muted-foreground">
        タスクを読み込み中...
      </div>
    );
  }

  if (tasksQuery.isError) {
    return (
      <div className="p-3 text-[11px] text-destructive">
        タスクの取得に失敗しました
      </div>
    );
  }

  const tasks = tasksQuery.data?.rows ?? [];

  if (tasks.length === 0) {
    return (
      <div className="p-3 text-[11px] text-muted-foreground">
        タスクがありません
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
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
            ? "w-full bg-selected px-2.5 py-1.5 text-left leading-tight hover:bg-selected-hover"
            : "w-full px-2.5 py-1.5 text-left leading-tight hover:bg-surface-hover"
        }
      >
        <div className="flex min-w-0 items-center gap-1">
          <TaskStageIcon stage={task.stage} className="!p-0.5 [&_svg]:size-3" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {task.title}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">
          {repoName}
          <span aria-hidden className="mx-0.5 opacity-50">
            ·
          </span>
          {lastEventLabel}
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
