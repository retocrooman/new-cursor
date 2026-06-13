import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";
import {
  createRun,
  createRunStartedEvent,
  runStartedPayload,
} from "@new-cursor/runs-feature";
import {
  findTaskById,
  TaskFeatureError,
  taskWorktreeReadyPayloadSchema,
  updateTaskStage,
} from "@new-cursor/tasks-feature";

import { buildRunPrompt } from "../build-run-prompt";
import type { PendingRunExecution } from "../pending-run";
import { withEvent, workerEventSpec } from "../with-event";

export async function handleTaskWorktreeReady(
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<PendingRunExecution | null> {
  const payload = taskWorktreeReadyPayloadSchema.parse(input.message.payload);
  const projection = await findTaskById(tx, payload.taskId);
  if (!projection) {
    throw TaskFeatureError.notFound(payload.taskId);
  }

  if (projection.stage !== "worktree_ready" || !projection.worktreePath) {
    return null;
  }

  const { updated, projection: implementingTask } = await updateTaskStage(tx, {
    taskId: projection.id,
    fromStage: "worktree_ready",
    toStage: "implementing",
  });
  if (!updated) {
    return null;
  }

  const run = await createRun(tx, {
    taskId: projection.id,
    agentId: input.agentId,
    stage: "implementing",
    summary: null,
  });

  await withEvent(tx, {
    actorId: input.agentId,
    run: async () => ({
      events: workerEventSpec({
        aggregate: run,
        payload: runStartedPayload({
          id: run.id,
          taskId: run.taskId,
          agentId: run.agentId,
          stage: run.stage,
          summary: run.summary,
        }),
        factory: createRunStartedEvent,
        occurredAtFrom: "created",
      }),
    }),
  });

  return {
    runId: run.id,
    taskId: projection.id,
    agentId: input.agentId,
    worktreePath: projection.worktreePath,
    title: projection.title,
    branchName: payload.branchName,
    prompt: buildRunPrompt({
      title: projection.title,
      branchName: payload.branchName,
    }),
    taskVersion: implementingTask.version,
  };
}
