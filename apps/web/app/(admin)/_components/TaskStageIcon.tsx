import type { TaskProjectionDto } from "@new-cursor/orpc-contract";
import { Badge, type BadgeTone } from "@new-cursor/ui";
import type { ReactNode } from "react";

import { TASK_STAGE_LABELS } from "./task-event-formatters";

type TaskStage = TaskProjectionDto["stage"];

const STAGE_TONE: Record<TaskStage, BadgeTone> = {
  created: "zinc",
  worktree_requested: "amber",
  worktree_ready: "cyan",
  queued: "indigo",
  implementing: "indigo",
  verifying: "cyan",
  waiting: "amber",
  completed: "emerald",
};

type Props = {
  stage: TaskStage | string;
  className?: string;
};

const ICON_CLASS = "size-3.5 shrink-0";

function StageSvg({
  children,
  spin = false,
}: {
  children: ReactNode;
  spin?: boolean;
}) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative; parent Badge has aria-label
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spin ? `${ICON_CLASS} animate-spin` : ICON_CLASS}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const STAGE_ICONS: Record<TaskStage, ReactNode> = {
  created: (
    <StageSvg>
      <path d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M9 2v3h3" />
    </StageSvg>
  ),
  worktree_requested: (
    <StageSvg spin>
      <path d="M13 3v4h-4" />
      <path d="M3 13v-4h4" />
      <path d="M12.5 6A5 5 0 0 0 4 7" />
      <path d="M3.5 10A5 5 0 0 0 12 9" />
    </StageSvg>
  ),
  worktree_ready: (
    <StageSvg>
      <path d="M2 5h4l1 1h7v7H2V5z" />
      <path d="M6 10l1.5 1.5L10 9" />
    </StageSvg>
  ),
  queued: (
    <StageSvg>
      <path d="M3 4h10" />
      <path d="M3 8h10" />
      <path d="M3 12h6" />
    </StageSvg>
  ),
  implementing: (
    <StageSvg spin>
      <path d="M5 5L2 8l3 3" />
      <path d="M11 5l3 3-3 3" />
    </StageSvg>
  ),
  verifying: (
    <StageSvg spin>
      <circle cx="8" cy="8" r="5" />
      <path d="M8 5v3l2 2" />
    </StageSvg>
  ),
  waiting: (
    <StageSvg>
      <path d="M8 3v5" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
    </StageSvg>
  ),
  completed: (
    <StageSvg>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8l2 2 3.5-4" />
    </StageSvg>
  ),
};

export function TaskStageIcon({ stage, className }: Props) {
  const label = TASK_STAGE_LABELS[stage] ?? stage;
  const tone = STAGE_TONE[stage as TaskStage] ?? "zinc";
  const icon = STAGE_ICONS[stage as TaskStage] ?? STAGE_ICONS.created;

  return (
    <Badge tone={tone} className={className} aria-label={label} title={label}>
      {icon}
    </Badge>
  );
}
