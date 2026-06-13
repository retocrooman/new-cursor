import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  type SQSClient,
} from "@aws-sdk/client-sqs";
import {
  and,
  asc,
  type DbOrTx,
  eq,
  inbox,
  isNull,
  outbox,
  sql,
} from "@new-cursor/db";
import {
  type DeliveryMessage,
  deliveryMessageSchema,
} from "@new-cursor/events";
import type { SqsEnv } from "@new-cursor/utils";
import { createSqsClient } from "@new-cursor/utils";

export type OutboxRow = {
  id: string;
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  actorId: string;
  version: number;
  occurredAt: Date;
};

export async function listPendingOutbox(
  tx: DbOrTx,
  limit = 10,
): Promise<OutboxRow[]> {
  const rows = await tx
    .select()
    .from(outbox)
    .where(isNull(outbox.relayedAt))
    .orderBy(asc(outbox.createdAt))
    .limit(limit);

  return rows as OutboxRow[];
}

export function outboxRowToDeliveryMessage(row: OutboxRow): DeliveryMessage {
  return deliveryMessageSchema.parse({
    eventId: row.eventId,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    eventType: row.eventType,
    payload: row.payload,
    actorId: row.actorId,
    version: row.version,
    occurredAt: row.occurredAt.toISOString(),
  });
}

export async function markOutboxRelayed(
  tx: DbOrTx,
  eventId: string,
  relayedAt = new Date(),
): Promise<void> {
  await tx
    .update(outbox)
    .set({ relayedAt })
    .where(and(eq(outbox.eventId, eventId), isNull(outbox.relayedAt)));
}

export async function publishDeliveryMessage(
  client: SQSClient,
  queueUrl: string,
  message: DeliveryMessage,
): Promise<void> {
  await client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
    }),
  );
}

export type RelayBatchResult = {
  published: number;
  failed: number;
};

export async function relayPendingOutbox(input: {
  db: DbOrTx;
  sqs: SqsEnv;
  limit?: number;
}): Promise<RelayBatchResult> {
  const client = createSqsClient(input.sqs);
  let published = 0;
  let failed = 0;

  try {
    const pending = await listPendingOutbox(input.db, input.limit ?? 10);
    for (const row of pending) {
      try {
        const message = outboxRowToDeliveryMessage(row);
        await publishDeliveryMessage(client, input.sqs.queueUrl, message);
        await markOutboxRelayed(input.db, row.eventId);
        published += 1;
      } catch {
        failed += 1;
      }
    }
  } finally {
    client.destroy();
  }

  return { published, failed };
}

export type InboxInsertResult = "inserted" | "duplicate";

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current != null && depth < 5; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: string }).code === "23505"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export async function tryInsertInbox(
  tx: DbOrTx,
  input: { eventId: string; messageId: string },
): Promise<InboxInsertResult> {
  try {
    await tx.insert(inbox).values({
      eventId: input.eventId,
      messageId: input.messageId,
      status: "received",
    });
    return "inserted";
  } catch (error) {
    if (isUniqueViolation(error)) {
      return "duplicate";
    }
    throw error;
  }
}

export async function markInboxProcessed(
  tx: DbOrTx,
  eventId: string,
  processedAt = new Date(),
): Promise<void> {
  await tx
    .update(inbox)
    .set({ status: "processed", processedAt })
    .where(eq(inbox.eventId, eventId));
}

export type ReceivedDelivery = {
  message: DeliveryMessage;
  receiptHandle: string;
  messageId: string;
};

export async function receiveDeliveryMessages(
  client: SQSClient,
  queueUrl: string,
  maxMessages = 10,
): Promise<ReceivedDelivery[]> {
  const response = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 1,
    }),
  );

  const results: ReceivedDelivery[] = [];
  for (const raw of response.Messages ?? []) {
    if (!raw.Body || !raw.ReceiptHandle || !raw.MessageId) {
      continue;
    }
    const parsed = deliveryMessageSchema.parse(JSON.parse(raw.Body));
    results.push({
      message: parsed,
      receiptHandle: raw.ReceiptHandle,
      messageId: raw.MessageId,
    });
  }
  return results;
}

export async function deleteDeliveryMessage(
  client: SQSClient,
  queueUrl: string,
  receiptHandle: string,
): Promise<void> {
  await client.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    }),
  );
}

export type AckBatchResult = {
  processed: number;
  duplicates: number;
  failed: number;
};

/** Worker Phase 3: inbox 記録 + SQS delete のみ（domain handler なし）。 */
export async function ackDeliveryMessages(input: {
  db: DbOrTx;
  sqs: SqsEnv;
  maxMessages?: number;
}): Promise<AckBatchResult> {
  const client = createSqsClient(input.sqs);
  let processed = 0;
  let duplicates = 0;
  let failed = 0;

  try {
    const received = await receiveDeliveryMessages(
      client,
      input.sqs.queueUrl,
      input.maxMessages ?? 10,
    );

    for (const item of received) {
      try {
        const insertResult = await tryInsertInbox(input.db, {
          eventId: item.message.eventId,
          messageId: item.messageId,
        });

        if (insertResult === "duplicate") {
          duplicates += 1;
        } else {
          await markInboxProcessed(input.db, item.message.eventId);
          processed += 1;
        }

        await deleteDeliveryMessage(
          client,
          input.sqs.queueUrl,
          item.receiptHandle,
        );
      } catch {
        failed += 1;
      }
    }
  } finally {
    client.destroy();
  }

  return { processed, duplicates, failed };
}

export async function countPendingOutbox(tx: DbOrTx): Promise<number> {
  const rows = await tx
    .select({ value: sql<number>`count(*)::int` })
    .from(outbox)
    .where(isNull(outbox.relayedAt));
  return rows[0]?.value ?? 0;
}
