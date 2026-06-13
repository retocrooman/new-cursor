import { randomUUID } from "node:crypto";
import { createAgent } from "@new-cursor/agents-feature";
import { eq, inbox, outbox, tasks } from "@new-cursor/db";
import {
  markInboxProcessed,
  tryInsertInbox,
} from "@new-cursor/delivery-feature";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import { insertTask } from "@new-cursor/tasks-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { dispatchToSubscribers } from "@new-cursor/worker-dispatch-feature";
import { describe, expect, it } from "vitest";

describe("processDeliveryMessages integration", () => {
  it("inbox insert, dispatch, and mark processed in one transaction", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "integration-worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created"],
      });
      const task = await insertTask(tx, { title: "integration" });
      const eventId = randomUUID();
      const messageId = randomUUID();

      const insertResult = await tryInsertInbox(tx, { eventId, messageId });
      expect(insertResult).toBe("inserted");

      await dispatchToSubscribers(tx, {
        eventId,
        aggregateType: "task",
        aggregateId: task.id,
        eventType: "task_created",
        payload: {
          taskId: task.id,
          title: task.title,
          branchName: task.branchName,
          repositoryId: task.repositoryId,
          parentTaskId: task.parentTaskId,
        },
        actorId: SYSTEM_ACTOR_ID,
        version: task.version,
        occurredAt: task.createdAt,
      });
      await markInboxProcessed(tx, eventId);

      const inboxRows = await tx
        .select()
        .from(inbox)
        .where(eq(inbox.eventId, eventId));
      expect(inboxRows[0]?.status).toBe("processed");

      const taskRows = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(taskRows[0]?.stage).toBe("worktree_requested");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.eventType, "task_stage_changed"));
      expect(outboxRows).toHaveLength(1);
    });
  });

  it("skips dispatch on duplicate inbox eventId", async () => {
    await withRollbackTx(async (tx) => {
      const agent = await createAgent(tx, { name: "dup-worker" });
      await upsertSubscription(tx, {
        agentId: agent.id,
        eventTypes: ["task_created"],
      });
      const task = await insertTask(tx, { title: "dup integration" });
      const eventId = randomUUID();

      await tryInsertInbox(tx, { eventId, messageId: "msg-1" });
      await dispatchToSubscribers(tx, {
        eventId,
        aggregateType: "task",
        aggregateId: task.id,
        eventType: "task_created",
        payload: {
          taskId: task.id,
          title: task.title,
          branchName: task.branchName,
          repositoryId: task.repositoryId,
          parentTaskId: task.parentTaskId,
        },
        actorId: SYSTEM_ACTOR_ID,
        version: task.version,
        occurredAt: task.createdAt,
      });
      await markInboxProcessed(tx, eventId);

      const duplicate = await tryInsertInbox(tx, {
        eventId,
        messageId: "msg-2",
      });
      expect(duplicate).toBe("duplicate");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.eventType, "task_stage_changed"));
      expect(outboxRows).toHaveLength(1);
    });
  });
});
