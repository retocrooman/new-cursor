import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";

import { resolveSubscribers } from "../resolve-subscribers";
import {
  applyTaskCreatedStageTransition,
  handleTaskCreated,
} from "./task-created";

type DispatchHandler = (
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
) => Promise<void>;

const DISPATCH_REGISTRY: Partial<Record<string, DispatchHandler>> = {
  task_created: handleTaskCreated,
};

export type DispatchResult = {
  agentCount: number;
  dispatched: number;
  errors: number;
};

/**
 * Fan-out failure policy: 1 エージェントの handler 失敗は他エージェントの dispatch を
 * 中断しない。stage 更新は applyTaskCreatedStageTransition で fan-out 前に 1 回だけ。
 */
export async function dispatchToSubscribers(
  tx: DbOrTx,
  message: DeliveryMessage,
): Promise<DispatchResult> {
  const handler = DISPATCH_REGISTRY[message.eventType];
  if (!handler) {
    return { agentCount: 0, dispatched: 0, errors: 0 };
  }

  const agentIds = await resolveSubscribers(tx, message.eventType);
  if (agentIds.length === 0) {
    return { agentCount: 0, dispatched: 0, errors: 0 };
  }

  if (message.eventType === "task_created") {
    const transitioned = await applyTaskCreatedStageTransition(tx, message);
    if (!transitioned) {
      return { agentCount: agentIds.length, dispatched: 0, errors: 0 };
    }
  }

  let dispatched = 0;
  let errors = 0;
  for (const [index, agentId] of agentIds.entries()) {
    try {
      await handler(tx, { message, agentId, fanOutIndex: index });
      dispatched += 1;
    } catch {
      errors += 1;
    }
  }

  return { agentCount: agentIds.length, dispatched, errors };
}
