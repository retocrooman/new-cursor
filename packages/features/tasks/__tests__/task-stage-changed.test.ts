import {
  createTaskStageChangedEvent,
  taskStageChangedPayload,
  taskStageChangedPayloadSchema,
} from "@new-cursor/tasks-feature";
import { describe, expect, it } from "vitest";

describe("task_stage_changed event", () => {
  it("builds a valid appendable event", () => {
    const event = createTaskStageChangedEvent({
      aggregateId: "11111111-1111-4111-8111-111111111111",
      actorId: "22222222-2222-4222-8222-222222222222",
      version: 2,
      occurredAt: "2026-06-13T00:00:00.000Z",
      payload: taskStageChangedPayload({
        taskId: "11111111-1111-4111-8111-111111111111",
        fromStage: "created",
        toStage: "worktree_requested",
      }),
    });

    expect(event.eventType).toBe("task_stage_changed");
    expect(event.aggregateType).toBe("task");
    expect(taskStageChangedPayloadSchema.parse(event.payload)).toEqual({
      taskId: "11111111-1111-4111-8111-111111111111",
      fromStage: "created",
      toStage: "worktree_requested",
    });
  });
});
