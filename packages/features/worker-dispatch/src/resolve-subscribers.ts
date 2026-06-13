import type { DbOrTx } from "@new-cursor/db";
import { listAgentsSubscribedTo } from "@new-cursor/subscriptions-feature";

export async function resolveSubscribers(
  tx: DbOrTx,
  eventType: string,
): Promise<string[]> {
  return listAgentsSubscribedTo(tx, eventType);
}
