import { describe, expect, it } from "vitest";

import {
  bucketEventsByTime,
  buildPredictedEventFlow,
  buildUnifiedTimeline,
  countEventsByType,
  deriveCompletionCriteria,
  formatRunDuration,
  formatRunTokenCount,
  stageProgressPercent,
} from "@/app/(admin)/_components/task-detail-helpers";

describe("task-detail-helpers", () => {
  it("computes stage progress percent", () => {
    expect(stageProgressPercent("created")).toBe(0);
    expect(stageProgressPercent("completed")).toBe(100);
    expect(stageProgressPercent("implementing")).toBe(80);
  });

  it("derives completion criteria from stage and events", () => {
    const criteria = deriveCompletionCriteria(
      {
        stage: "worktree_ready",
        background: "Fix login bug",
        verificationItems: "Login works",
      },
      [{ eventType: "task_created" }, { eventType: "task_worktree_ready" }],
    );

    expect(criteria.find((item) => item.id === "task_created")?.status).toBe(
      "met",
    );
    expect(criteria.find((item) => item.id === "worktree_ready")?.status).toBe(
      "met",
    );
    expect(criteria.find((item) => item.id === "implementation")?.status).toBe(
      "pending",
    );
    expect(
      criteria.find((item) => item.id === "verification_items")?.status,
    ).toBe("met");
  });

  it("marks verification pending when fields are empty", () => {
    const criteria = deriveCompletionCriteria(
      { stage: "created", background: null, verificationItems: null },
      [{ eventType: "task_created" }],
    );

    expect(criteria.find((item) => item.id === "background")?.status).toBe(
      "pending",
    );
    expect(
      criteria.find((item) => item.id === "verification_items")?.status,
    ).toBe("pending");
  });

  it("buckets events by relative time", () => {
    const buckets = bucketEventsByTime(
      [
        { createdAt: "2026-06-13T10:00:00.000Z" },
        { createdAt: "2026-06-13T10:30:00.000Z" },
        { createdAt: "2026-06-13T11:00:00.000Z" },
      ],
      3,
    );

    expect(buckets).toHaveLength(3);
    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(3);
  });

  it("counts events by type", () => {
    const counts = countEventsByType([
      { eventType: "task_created" },
      { eventType: "task_stage_changed" },
      { eventType: "task_stage_changed" },
    ]);

    expect(counts).toEqual([
      { eventType: "task_stage_changed", count: 2 },
      { eventType: "task_created", count: 1 },
    ]);
  });

  it("formats run duration by status", () => {
    expect(
      formatRunDuration(
        "2026-06-13T10:00:00.000Z",
        "2026-06-13T10:00:30.000Z",
        "completed",
      ),
    ).toBe("30秒");
    expect(
      formatRunDuration(
        "2026-06-13T10:00:00.000Z",
        "2026-06-13T10:05:00.000Z",
        "running",
      ),
    ).toBe("実行中");
  });

  it("formats run token count when available", () => {
    expect(
      formatRunTokenCount({
        id: "00000000-0000-4000-8000-000000000010",
        taskId: "00000000-0000-4000-8000-000000000001",
        agentId: "00000000-0000-4000-8000-000000000020",
        cursorAgentId: null,
        status: "completed",
        stage: null,
        summary: null,
        errorMessage: null,
        createdAt: "2026-06-13T10:30:00.000Z",
        updatedAt: "2026-06-13T10:31:00.000Z",
        deletedAt: null,
        version: 1,
      }),
    ).toBe("—");

    expect(
      formatRunTokenCount({
        id: "00000000-0000-4000-8000-000000000010",
        taskId: "00000000-0000-4000-8000-000000000001",
        agentId: "00000000-0000-4000-8000-000000000020",
        cursorAgentId: null,
        status: "completed",
        stage: null,
        summary: null,
        errorMessage: null,
        createdAt: "2026-06-13T10:30:00.000Z",
        updatedAt: "2026-06-13T10:31:00.000Z",
        deletedAt: null,
        version: 1,
        tokenCount: 12345,
      } as Parameters<typeof formatRunTokenCount>[0]),
    ).toBe("12,345");
  });

  it("merges task events, runs, and child tasks chronologically", () => {
    const taskId = "00000000-0000-4000-8000-000000000001";
    const timeline = buildUnifiedTimeline(
      { id: taskId },
      [
        {
          aggregateType: "task",
          aggregateId: taskId,
          eventType: "task_created",
          payload: null,
          actorId: "00000000-0000-4000-8000-000000000099",
          createdAt: "2026-06-13T10:00:00.000Z",
          version: 1,
        },
      ],
      [
        {
          id: "00000000-0000-4000-8000-000000000010",
          taskId,
          agentId: "00000000-0000-4000-8000-000000000020",
          cursorAgentId: null,
          status: "completed",
          stage: null,
          summary: null,
          errorMessage: null,
          createdAt: "2026-06-13T10:30:00.000Z",
          updatedAt: "2026-06-13T10:31:00.000Z",
          deletedAt: null,
          version: 1,
        },
      ],
      {},
      [
        {
          id: "00000000-0000-4000-8000-000000000030",
          title: "Child task",
          branchName: null,
          repositoryId: null,
          parentTaskId: taskId,
          background: null,
          verificationItems: null,
          stage: "created",
          worktreePath: null,
          createdAt: "2026-06-13T11:00:00.000Z",
          updatedAt: "2026-06-13T11:00:00.000Z",
          deletedAt: null,
          version: 1,
        },
      ],
    );

    expect(timeline).toHaveLength(3);
    expect(timeline[0]?.kind).toBe("event");
    expect(timeline[1]?.kind).toBe("run");
    expect(timeline[2]?.kind).toBe("child_task");
  });

  it("filters run event types from task aggregate events", () => {
    const taskId = "00000000-0000-4000-8000-000000000001";
    const timeline = buildUnifiedTimeline(
      { id: taskId },
      [
        {
          aggregateType: "task",
          aggregateId: taskId,
          eventType: "run_started",
          payload: null,
          actorId: "00000000-0000-4000-8000-000000000099",
          createdAt: "2026-06-13T10:00:00.000Z",
          version: 1,
        },
      ],
      [],
      {},
    );

    expect(timeline).toHaveLength(0);
  });

  it("builds predicted flow with current stage and future nodes", () => {
    const graph = buildPredictedEventFlow(
      { stage: "worktree_ready" },
      [{ eventType: "task_created" }, { eventType: "task_worktree_ready" }],
      [],
    );

    expect(
      graph.nodes.find((node) => node.id === "worktree_ready")?.status,
    ).toBe("current");
    expect(graph.nodes.find((node) => node.id === "task_created")?.status).toBe(
      "past",
    );
    expect(
      graph.nodes.find((node) => node.id === "task_pr_requested")?.status,
    ).toBe("future");
    expect(graph.edges.some((edge) => edge.style === "dashed")).toBe(true);
  });

  it("marks run error branch when run failed", () => {
    const graph = buildPredictedEventFlow(
      { stage: "implementing" },
      [{ eventType: "task_created" }],
      [{ status: "error" }],
    );

    expect(
      graph.nodes.find((node) => node.id === "run_completed_error")?.status,
    ).toBe("current");
  });
});
