import { GetQueueAttributesCommand } from "@aws-sdk/client-sqs";
import { createAgent } from "@new-cursor/agents-feature";
import {
  createClient,
  eq,
  getRawClient,
  inbox,
  outbox,
  tasks,
} from "@new-cursor/db";
import {
  processDeliveryMessages,
  relayPendingOutbox,
} from "@new-cursor/delivery-feature";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import {
  createTaskCreatedEvent,
  insertTask,
  taskCreatedPayload,
} from "@new-cursor/tasks-feature";
import { createSqsClient } from "@new-cursor/utils";
import { dispatchToSubscribers } from "@new-cursor/worker-dispatch-feature";
import { describe, expect, it } from "vitest";

import { withFreshScenario } from "../src/with-fresh-scenario";

describe("golden path — task_created relay and dispatch", () => {
  it("updates stage, records inbox, and consumes SQS", async () => {
    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });

      try {
        await db.transaction(async (tx) => {
          const agent = await createAgent(tx, { name: "e2e-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: ["task_created"],
          });
        });

        let taskId = "";
        let eventId = "";
        await db.transaction(async (tx) => {
          const task = await insertTask(tx, { title: "e2e golden path" });
          taskId = task.id;
          const appendable = createTaskCreatedEvent({
            aggregateId: task.id,
            actorId: SYSTEM_ACTOR_ID,
            version: task.version,
            occurredAt: task.createdAt,
            payload: taskCreatedPayload({
              id: task.id,
              title: task.title,
              branchName: task.branchName,
              repositoryId: task.repositoryId,
              parentTaskId: task.parentTaskId,
            }),
          });
          const appended = await appendEvent(tx, appendable);
          eventId = appended.eventId;
          await writeOutbox(tx, { ...appendable, eventId });
        });

        const relayResult = await relayPendingOutbox({ db, sqs: env.sqs });
        expect(relayResult.published).toBe(1);
        expect(relayResult.failed).toBe(0);

        const processResult = await processDeliveryMessages({
          db,
          sqs: env.sqs,
          dispatch: async (tx, message) => {
            await dispatchToSubscribers(tx, message);
          },
        });
        expect(processResult.processed).toBe(1);
        expect(processResult.failed).toBe(0);

        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        expect(taskRows[0]?.stage).toBe("worktree_requested");

        const taskCreatedOutbox = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "task_created"));
        expect(taskCreatedOutbox[0]?.relayedAt).not.toBeNull();

        const stageChangedOutbox = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "task_stage_changed"));
        expect(stageChangedOutbox).toHaveLength(1);
        expect(stageChangedOutbox[0]?.relayedAt).toBeNull();

        const inboxRows = await db
          .select()
          .from(inbox)
          .where(eq(inbox.eventId, eventId));
        expect(inboxRows[0]?.status).toBe("processed");

        const sqsClient = createSqsClient(env.sqs);
        try {
          const attrs = await sqsClient.send(
            new GetQueueAttributesCommand({
              QueueUrl: env.sqs.queueUrl,
              AttributeNames: ["ApproximateNumberOfMessages"],
            }),
          );
          expect(attrs.Attributes?.ApproximateNumberOfMessages).toBe("0");
        } finally {
          sqsClient.destroy();
        }
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});
