import type { DbOrTx } from "@new-cursor/db";
import type { DeliveryMessage } from "@new-cursor/events";
import { resolveRulesForAgent } from "@new-cursor/rules-feature";
import {
  createRun,
  createRunStartedEvent,
  runStartedPayload,
} from "@new-cursor/runs-feature";
import {
  findTaskById,
  TaskFeatureError,
  taskStageChangedPayloadSchema,
} from "@new-cursor/tasks-feature";

import { buildRunPrompt } from "../build-run-prompt";
import type { PendingRunExecution } from "../pending-run";
import { withEvent, workerEventSpec } from "../with-event";

export async function createVerifyRun(
  tx: DbOrTx,
  input: { message: DeliveryMessage; agentId: string; fanOutIndex: number },
): Promise<PendingRunExecution | null> {
  const payload = taskStageChangedPayloadSchema.parse(input.message.payload);
  if (payload.toStage !== "verify") {
    return null;
  }

  const projection = await findTaskById(tx, payload.taskId);
  if (!projection) {
    throw TaskFeatureError.notFound(payload.taskId);
  }

  if (projection.stage !== "verify" || !projection.worktreePath) {
    return null;
  }

  const branchName = projection.branchName;
  if (!branchName) {
    return null;
  }

  const run = await createRun(tx, {
    taskId: projection.id,
    agentId: input.agentId,
    stage: "verify",
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

  const resolvedRules = await resolveRulesForAgent(tx, input.agentId);

  return {
    runId: run.id,
    taskId: projection.id,
    agentId: input.agentId,
    worktreePath: projection.worktreePath,
    title: projection.title,
    branchName,
    prompt: buildRunPrompt({
      title: projection.title,
      branchName,
      rules: {
        all: resolvedRules.all.map((rule) => rule.content),
        agent: resolvedRules.agent.map((rule) => rule.content),
      },
    }),
    taskVersion: projection.version + input.fanOutIndex,
  };
}
