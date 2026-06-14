"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { orpcBrowser } from "@/lib/orpc/client.browser";

import { ColumnResizeHandle } from "./ColumnResizeHandle";
import { CommanderPanel } from "./CommanderPanel";
import {
  clampColumnWidths,
  getStoredColumnWidths,
  type HomeShellColumnWidths,
  setStoredColumnWidths,
} from "./home-shell-layout";
import { TaskDetailColumn } from "./TaskDetailColumn";
import { TaskListColumn } from "./TaskListColumn";

export function HomeShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<HomeShellColumnWidths>(
    getStoredColumnWidths,
  );

  const reposQuery = useQuery({
    queryKey: ["repositories.list"],
    queryFn: () => orpcBrowser.repositories.list({ limit: 100 }),
  });

  const repositoriesById: Record<string, string> = {};
  for (const repo of reposQuery.data?.rows ?? []) {
    repositoriesById[repo.id] = repo.name;
  }

  useEffect(() => {
    setColumnWidths(getStoredColumnWidths());
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function syncWidths() {
      setColumnWidths((current) => {
        const next = clampColumnWidths(current, container!.clientWidth);
        if (
          next.taskList === current.taskList &&
          next.commander === current.commander
        ) {
          return current;
        }
        setStoredColumnWidths(next);
        return next;
      });
    }

    syncWidths();

    const observer = new ResizeObserver(syncWidths);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const updateWidths = useCallback(
    (updater: (current: HomeShellColumnWidths) => HomeShellColumnWidths) => {
      setColumnWidths((current) => {
        const containerWidth = containerRef.current?.clientWidth ?? 0;
        const next = clampColumnWidths(updater(current), containerWidth);
        if (
          next.taskList === current.taskList &&
          next.commander === current.commander
        ) {
          return current;
        }
        setStoredColumnWidths(next);
        return next;
      });
    },
    [],
  );

  function resizeTaskList(deltaX: number) {
    updateWidths((current) => ({
      ...current,
      taskList: current.taskList + deltaX,
    }));
  }

  function resizeCommander(deltaX: number) {
    updateWidths((current) => ({
      ...current,
      commander: current.commander - deltaX,
    }));
  }

  return (
    <div ref={containerRef} className="flex h-full min-h-0">
      <section
        aria-label="タスクリスト"
        style={{ width: columnWidths.taskList }}
        className="flex shrink-0 flex-col bg-sidebar"
      >
        <header className="border-b border-border px-3 py-2">
          <h1 className="text-xs font-semibold text-foreground">タスク</h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TaskListColumn repositoriesById={repositoriesById} />
        </div>
      </section>

      <ColumnResizeHandle
        label="タスクリストとタスク詳細の幅を調整"
        onResize={resizeTaskList}
      />

      <section
        aria-label="タスク詳細"
        className="flex min-w-0 flex-1 flex-col bg-panel"
      >
        <TaskDetailColumn repositoriesById={repositoriesById} />
      </section>

      <ColumnResizeHandle
        label="タスク詳細と司令官の幅を調整"
        onResize={resizeCommander}
      />

      <section
        aria-label="司令官"
        style={{ width: columnWidths.commander }}
        className="flex min-w-0 shrink-0 flex-col overflow-hidden bg-sidebar"
      >
        <CommanderPanel />
      </section>
    </div>
  );
}
