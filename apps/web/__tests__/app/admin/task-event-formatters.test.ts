import type { EventListItem } from "@new-cursor/orpc-contract";
import { describe, expect, it } from "vitest";

import { formatTaskEvent } from "@/app/(admin)/_components/task-event-formatters";

describe("task-event-formatters", () => {
  it("formats stage changes with Japanese labels", () => {
    const formatted = formatTaskEvent({
      eventType: "task_stage_changed",
      payload: {
        taskId: "00000000-0000-4000-8000-000000000001",
        fromStage: "created",
        toStage: "worktree_requested",
      },
    } as EventListItem);

    expect(formatted.title).toBe("ステージ更新: 作成済 → worktree 要求中");
  });
});
