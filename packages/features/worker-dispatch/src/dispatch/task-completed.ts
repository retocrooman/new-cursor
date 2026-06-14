import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";

export async function handleTaskCompleted(
  _tx: DbOrTx,
  _input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<null> {
  return null;
}
