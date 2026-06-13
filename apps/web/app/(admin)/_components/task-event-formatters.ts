import type { EventFormatterRegistry } from "./EventHistoryTab";

type TaskCreatedPayload = {
  title: string;
};

export const TASK_EVENT_FORMATTERS: EventFormatterRegistry = {
  task_created: (payload) => {
    const p = payload as TaskCreatedPayload;
    return {
      icon: "create",
      title: `タスク作成: ${p.title}`,
    };
  },
  task_stage_changed: (payload) => {
    const p = payload as { fromStage: string; toStage: string };
    return {
      icon: "transition",
      title: `${p.fromStage} → ${p.toStage}`,
    };
  },
  task_worktree_ready: () => ({
    icon: "system",
    title: "worktree 準備完了",
  }),
  task_queued: () => ({
    icon: "system",
    title: "キュー待ち",
  }),
};

export const TASK_STAGE_LABELS: Record<string, string> = {
  created: "作成済",
  worktree_requested: "worktree 要求中",
  worktree_ready: "worktree 準備完了",
  queued: "キュー待ち",
  implementing: "実装中",
  completed: "完了",
};
