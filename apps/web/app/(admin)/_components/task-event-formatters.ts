import { type FormattedEvent, genericFallback } from "@new-cursor/events";
import type { EventListItem } from "@new-cursor/orpc-contract";

import type { EventFormatterRegistry } from "./EventHistoryTab";

type TaskCreatedPayload = {
  title: string;
  branchName?: string | null;
};

type TaskStageChangedPayload = {
  fromStage: string;
  toStage: string;
};

type TaskWorktreeReadyPayload = {
  branchName: string;
};

type TaskQueuedPayload = {
  branchName: string;
  blockingTaskId: string;
};

export const TASK_STAGE_LABELS: Record<string, string> = {
  created: "作成済",
  worktree_requested: "worktree 要求中",
  worktree_ready: "worktree 準備完了",
  queued: "キュー待ち",
  implementing: "実装中",
  completed: "完了",
};

export const TASK_EVENT_FORMATTERS: EventFormatterRegistry = {
  task_created: (payload) => {
    const p = payload as TaskCreatedPayload;
    const branch =
      p.branchName != null && p.branchName !== ""
        ? `（ブランチ: ${p.branchName}）`
        : "";
    return {
      icon: "create",
      title: `タスクを起票: ${p.title}${branch}`,
    };
  },
  task_stage_changed: (payload) => {
    const p = payload as TaskStageChangedPayload;
    const from = TASK_STAGE_LABELS[p.fromStage] ?? p.fromStage;
    const to = TASK_STAGE_LABELS[p.toStage] ?? p.toStage;
    return {
      icon: "transition",
      title: `ステージ更新: ${from} → ${to}`,
    };
  },
  task_worktree_ready: (payload) => {
    const p = payload as TaskWorktreeReadyPayload;
    return {
      icon: "system",
      title: `worktree 準備完了（${p.branchName}）`,
    };
  },
  task_queued: (payload) => {
    const p = payload as TaskQueuedPayload;
    return {
      icon: "system",
      title: `同一ブランチのためキュー待ち（${p.branchName}）`,
    };
  },
};

export function formatTaskEvent(
  event: Pick<EventListItem, "eventType" | "payload">,
): FormattedEvent {
  if (event.payload == null) {
    return genericFallback(event.eventType);
  }
  return (
    TASK_EVENT_FORMATTERS[event.eventType]?.(event.payload) ??
    genericFallback(event.eventType)
  );
}
