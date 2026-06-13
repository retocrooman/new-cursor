import { agents, type DbOrTx, eq, subscriptions } from "@new-cursor/db";
import { defineDomainError } from "@new-cursor/errors";
import { BaseRepository } from "@new-cursor/repository-kit";

import {
  type SubscriptionProjection,
  type SubscriptionRow,
  toSubscriptionProjection,
} from "../model/projection";

export const SubscriptionFeatureError = defineDomainError(
  "Subscription",
  "subscriptions-feature",
);

class SubscriptionsRepository extends BaseRepository<
  SubscriptionRow,
  SubscriptionProjection,
  "agentId"
> {
  protected override readonly table = subscriptions;
  protected override readonly errors = SubscriptionFeatureError;
  protected override readonly defaultSort = {
    column: subscriptions.createdAt,
    direction: "desc" as const,
  };
  protected override readonly sortableFields = {
    createdAt: subscriptions.createdAt,
    updatedAt: subscriptions.updatedAt,
  };
  protected override readonly filterableFields = ["agentId"] as const;

  protected toProjection(row: SubscriptionRow): SubscriptionProjection {
    return toSubscriptionProjection(row);
  }
}

const subscriptionsRepository = new SubscriptionsRepository();

async function assertAgentExists(tx: DbOrTx, agentId: string): Promise<void> {
  const rows = await tx
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.id, agentId));
  if (rows.length === 0) {
    throw SubscriptionFeatureError.notFound(agentId);
  }
}

export async function upsertSubscription(
  tx: DbOrTx,
  input: {
    agentId: string;
    eventTypes: string[];
  },
): Promise<SubscriptionProjection> {
  await assertAgentExists(tx, input.agentId);

  const now = new Date();
  const existing = await findSubscriptionByAgentId(tx, input.agentId);

  if (existing) {
    const [row] = await tx
      .update(subscriptions)
      .set({
        eventTypes: input.eventTypes,
        updatedAt: now,
        version: existing.version + 1,
      })
      .where(eq(subscriptions.agentId, input.agentId))
      .returning();

    if (!row) {
      throw SubscriptionFeatureError.insertFailed();
    }

    return toSubscriptionProjection(row as SubscriptionRow);
  }

  const [row] = await tx
    .insert(subscriptions)
    .values({
      agentId: input.agentId,
      eventTypes: input.eventTypes,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
    .returning();

  if (!row) {
    throw SubscriptionFeatureError.insertFailed();
  }

  return toSubscriptionProjection(row as SubscriptionRow);
}

export async function findSubscriptionById(
  tx: DbOrTx,
  id: string,
): Promise<SubscriptionProjection | null> {
  return subscriptionsRepository.findById(tx, id);
}

export async function findSubscriptionByAgentId(
  tx: DbOrTx,
  agentId: string,
): Promise<SubscriptionProjection | null> {
  const rows = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.agentId, agentId));
  const row = rows[0];
  return row ? toSubscriptionProjection(row as SubscriptionRow) : null;
}

export async function listSubscriptions(
  tx: DbOrTx,
  opts?: Parameters<typeof subscriptionsRepository.list>[1],
) {
  return subscriptionsRepository.list(tx, opts);
}

export async function listAgentsSubscribedTo(
  tx: DbOrTx,
  eventType: string,
): Promise<string[]> {
  const rows = await tx.select().from(subscriptions);
  return rows
    .filter((row) => row.eventTypes.includes(eventType))
    .map((row) => row.agentId);
}
