import { createAgent } from "@new-cursor/agents-feature";
import { eq, events, outbox, runs } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";
import {
  createRun,
  createRunStartedEvent,
  runStartedPayload,
} from "@new-cursor/runs-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("createRun", () => {
  it("creates a run linked to task and agent", async () => {
    await withRollbackTx(async (tx) => {
      const task = await insertTask(tx, { title: "run task" });
      const agent = await createAgent(tx, { name: "executor" });

      const projection = await createRun(tx, {
        taskId: task.id,
        agentId: agent.id,
        stage: "implement",
        summary: "starting work",
      });

      expect(projection.taskId).toBe(task.id);
      expect(projection.agentId).toBe(agent.id);

      const rows = await tx
        .select()
        .from(runs)
        .where(eq(runs.id, projection.id));
      expect(rows).toHaveLength(1);
    });
  });

  it("writes run_started event and outbox", async () => {
    await withRollbackTx(async (tx) => {
      const task = await insertTask(tx, { title: "run task" });
      const agent = await createAgent(tx, { name: "executor" });
      const projection = await createRun(tx, {
        taskId: task.id,
        agentId: agent.id,
      });

      const appendable = createRunStartedEvent({
        aggregateType: "run",
        aggregateId: projection.id,
        eventType: "run_started",
        actorId: SYSTEM_ACTOR_ID,
        version: projection.version,
        occurredAt: projection.createdAt,
        payload: runStartedPayload({
          id: projection.id,
          taskId: projection.taskId,
          agentId: projection.agentId,
          stage: projection.stage,
          summary: projection.summary,
        }),
      });
      const { eventId } = await appendEvent(tx, appendable);
      await writeOutbox(tx, { ...appendable, eventId });

      const eventRows = await tx
        .select()
        .from(events)
        .where(eq(events.aggregateId, projection.id));
      expect(eventRows).toHaveLength(1);
      expect(eventRows[0]?.eventType).toBe("run_started");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, projection.id));
      expect(outboxRows).toHaveLength(1);
    });
  });
});
