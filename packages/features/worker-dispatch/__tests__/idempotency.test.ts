import { randomUUID } from "node:crypto";
import { createAgent } from "@new-cursor/agents-feature";
import { and, eq, events, outbox, tasks } from "@new-cursor/db";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

import { dispatchToSubscribers } from "../src/dispatch";
import { taskCreatedMessage } from "./helpers";

describe("dispatch idempotency", () => {
  it("does not double-emit when stage already transitioned", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created"],
      });
      const task = await insertTask(tx, { title: "idempotent dispatch" });
      const message = taskCreatedMessage(task);

      await dispatchToSubscribers(tx, message);
      await dispatchToSubscribers(tx, message);

      const eventRows = await tx
        .select()
        .from(events)
        .where(eq(events.aggregateId, task.id));
      expect(
        eventRows.filter((row) => row.eventType === "task_stage_changed"),
      ).toHaveLength(1);

      const taskRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(taskRows[0]?.version).toBe(2);
    });
  });
});

describe("inbox duplicate eventId", () => {
  it("documents that processDeliveryMessages skips dispatch on duplicate", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created"],
      });
      const task = await insertTask(tx, { title: "inbox idempotent" });
      const eventId = randomUUID();
      const message = taskCreatedMessage(task, eventId);

      await dispatchToSubscribers(tx, message);

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.eventType, "task_stage_changed"),
            eq(outbox.aggregateId, task.id),
          ),
        );
      expect(outboxRows).toHaveLength(1);

      await dispatchToSubscribers(tx, message);
      const outboxAfter = await tx
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.eventType, "task_stage_changed"),
            eq(outbox.aggregateId, task.id),
          ),
        );
      expect(outboxAfter).toHaveLength(1);
    });
  });
});
