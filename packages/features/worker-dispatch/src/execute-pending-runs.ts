import {
  type CursorSdkPort,
  createCursorSdkAdapter,
} from "@new-cursor/cursor-sdk-port";
import type { Database } from "@new-cursor/db";
import {
  createRunCompletedEvent,
  findRunById,
  runCompletedPayload,
  updateRunAfterSdk,
} from "@new-cursor/runs-feature";
import {
  createTaskStageChangedEvent,
  findTaskById,
  taskStageChangedPayload,
  updateTaskStage,
} from "@new-cursor/tasks-feature";

import type { PendingRunExecution } from "./pending-run";
import { withEvent, workerEventSpec } from "./with-event";

export async function executePendingRun(
  db: Database,
  pending: PendingRunExecution,
  adapter: CursorSdkPort = createCursorSdkAdapter(),
): Promise<void> {
  const apiKey = process.env.CURSOR_API_KEY;
  const result = await adapter.execute({
    cwd: pending.worktreePath,
    prompt: pending.prompt,
    apiKey,
  });

  await db.transaction(async (tx) => {
    const existingRun = await findRunById(tx, pending.runId);
    if (!existingRun) {
      return;
    }

    if (result.ok) {
      const run = await updateRunAfterSdk(tx, {
        runId: pending.runId,
        cursorAgentId: result.cursorAgentId,
        status: "completed",
        summary: result.summary ?? null,
      });

      await withEvent(tx, {
        actorId: pending.agentId,
        run: async () => ({
          events: workerEventSpec({
            aggregate: run,
            payload: runCompletedPayload({
              id: run.id,
              taskId: run.taskId,
              agentId: run.agentId,
              status: "completed",
              stage: run.stage,
              summary: run.summary,
              errorMessage: run.errorMessage,
              cursorAgentId: run.cursorAgentId,
            }),
            factory: createRunCompletedEvent,
            occurredAtFrom: "updated",
          }),
        }),
      });

      const task = await findTaskById(tx, pending.taskId);
      if (task?.stage === "implementing") {
        const { updated, projection } = await updateTaskStage(tx, {
          taskId: pending.taskId,
          fromStage: "implementing",
          toStage: "verify",
        });
        if (updated) {
          await withEvent(tx, {
            actorId: pending.agentId,
            run: async () => ({
              events: workerEventSpec({
                aggregate: projection,
                payload: taskStageChangedPayload({
                  taskId: projection.id,
                  fromStage: "implementing",
                  toStage: "verify",
                }),
                factory: createTaskStageChangedEvent,
                occurredAtFrom: "updated",
              }),
            }),
          });
        }
      }
      return;
    }

    const run = await updateRunAfterSdk(tx, {
      runId: pending.runId,
      cursorAgentId: result.cursorAgentId ?? "unknown",
      status: "error",
      errorMessage: result.error,
    });

    await withEvent(tx, {
      actorId: pending.agentId,
      run: async () => ({
        events: workerEventSpec({
          aggregate: run,
          payload: runCompletedPayload({
            id: run.id,
            taskId: run.taskId,
            agentId: run.agentId,
            status: "error",
            stage: run.stage,
            summary: run.summary,
            errorMessage: run.errorMessage,
            cursorAgentId: run.cursorAgentId,
          }),
          factory: createRunCompletedEvent,
          occurredAtFrom: "updated",
        }),
      }),
    });
  });
}

export async function executePendingRuns(
  db: Database,
  pendingRuns: PendingRunExecution[],
  adapter?: CursorSdkPort,
): Promise<void> {
  for (const pending of pendingRuns) {
    await executePendingRun(db, pending, adapter);
  }
}
