"use client";

import { useQuery } from "@tanstack/react-query";

import { orpcBrowser } from "@/lib/orpc/client.browser";

import { CommanderPanel } from "./CommanderPanel";
import { TaskDetailColumn } from "./TaskDetailColumn";
import { TaskListColumn } from "./TaskListColumn";

export function HomeShell() {
  const reposQuery = useQuery({
    queryKey: ["repositories.list"],
    queryFn: () => orpcBrowser.repositories.list({ limit: 100 }),
  });

  const repositoriesById: Record<string, string> = {};
  for (const repo of reposQuery.data?.rows ?? []) {
    repositoriesById[repo.id] = repo.name;
  }

  return (
    <div className="flex h-full min-h-0">
      <section
        aria-label="タスクリスト"
        className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50"
      >
        <header className="border-b border-zinc-200 px-4 py-3">
          <h1 className="text-sm font-semibold text-zinc-900">タスク</h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TaskListColumn repositoriesById={repositoriesById} />
        </div>
      </section>

      <section
        aria-label="タスク詳細"
        className="flex min-w-0 flex-1 flex-col border-r border-zinc-200 bg-white"
      >
        <TaskDetailColumn repositoriesById={repositoriesById} />
      </section>

      <section
        aria-label="司令官"
        className="flex w-96 shrink-0 flex-col bg-zinc-50"
      >
        <CommanderPanel />
      </section>
    </div>
  );
}
