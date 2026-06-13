import { randomUUID } from "node:crypto";
import { eq, events, outbox } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import {
  createTaskStageChangedEvent,
  insertTask,
  taskStageChangedPayload,
} from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { withEvent, workerEventSpec } from "../src/with-event";

describe("withEvent", () => {
  it("appends event and writes outbox in the same transaction", async () => {
    await withRollbackTx(async (tx) => {
      const agentId = randomUUID();
      const task = await insertTask(tx, { title: "with-event" });

      await withEvent(tx, {
        actorId: agentId,
        run: async () => ({
          events: workerEventSpec({
            aggregate: task,
            payload: taskStageChangedPayload({
              taskId: task.id,
              fromStage: "created",
              toStage: "worktree_requested",
            }),
            factory: createTaskStageChangedEvent,
            occurredAtFrom: "updated",
          }),
        }),
      });

      const eventRows = await tx
        .select()
        .from(events)
        .where(eq(events.aggregateId, task.id));
      expect(eventRows).toHaveLength(1);
      expect(eventRows[0]?.eventType).toBe("task_stage_changed");
      expect(eventRows[0]?.actorId).toBe(agentId);
      expect(eventRows[0]?.actorId).not.toBe(SYSTEM_ACTOR_ID);

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, task.id));
      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0]?.eventType).toBe("task_stage_changed");
    });
  });
});
