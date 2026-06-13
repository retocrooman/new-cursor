import {
  resolveAgentModelId,
  type TaskProjectionDto,
} from "@new-cursor/orpc-contract";
import { listRepositories } from "@new-cursor/repositories-feature";
import {
  parseRecordDecisionActions,
  stripRecordDecisionActions,
} from "@new-cursor/tasks-feature";
import { createRouterClient } from "@orpc/server";

import {
  buildCommanderSystemPrompt,
  buildTaskContextBlock,
  clearCommanderAgentId,
  getCommanderAgentId,
  parseCreateTaskAction,
  resolveRepoRoot,
  setCommanderAgentId,
  stripCreateTaskAction,
} from "@/lib/commander";
import { createCommanderAgent } from "@/lib/commander/server";

import { mapErrors } from "../errors";
import { os } from "../os";
import { router } from "../router";

const sendHandler = os.commander.send.handler(({ context, input }) =>
  mapErrors(async () => {
    const agent = await createCommanderAgent();
    const apiKey = process.env.CURSOR_API_KEY ?? "";
    const storedAgentId = getCommanderAgentId(context.actorId);
    const agentId = input.agentId ?? storedAgentId;

    const apiClient = createRouterClient(router, {
      context: () => context,
    });

    const { rows: repositories } = await listRepositories(context.db, {
      limit: 100,
    });
    const repoById = new Map(repositories.map((r) => [r.id, r.name]));

    let taskContextBlock: string | undefined;
    if (input.taskId) {
      try {
        const task = await apiClient.tasks.get({ id: input.taskId });
        taskContextBlock = buildTaskContextBlock({
          id: task.id,
          title: task.title,
          stage: task.stage,
          branchName: task.branchName,
          repositoryId: task.repositoryId,
          repositoryName: task.repositoryId
            ? (repoById.get(task.repositoryId) ?? null)
            : null,
          background: task.background,
          verificationItems: task.verificationItems,
        });
      } catch {
        // ignore missing task; proceed without context
      }
    }

    const systemPrompt = buildCommanderSystemPrompt(
      repositories.map((r) => ({ id: r.id, name: r.name })),
      taskContextBlock,
    );

    const turn = await agent.sendTurn({
      message: input.message,
      agentId,
      modelId: resolveAgentModelId(input.modelId),
      systemPrompt,
      cwd: resolveRepoRoot(),
      apiKey,
    });

    setCommanderAgentId(context.actorId, turn.agentId);

    const action = parseCreateTaskAction(turn.reply);
    let taskCreated: TaskProjectionDto | undefined;

    if (action) {
      taskCreated = await apiClient.tasks.create({
        title: action.title,
        branchName: action.branchName ?? null,
        repositoryId: action.repositoryId ?? null,
        background: action.background ?? null,
        verificationItems: action.verificationItems ?? null,
      });
    }

    for (const decision of parseRecordDecisionActions(turn.reply)) {
      const taskId = decision.taskId ?? taskCreated?.id ?? input.taskId ?? null;
      if (!taskId) continue;

      await apiClient.decisions.create({
        taskId,
        summary: decision.summary,
        context: decision.context,
        userResponse: decision.userResponse,
      });
    }

    let reply = stripCreateTaskAction(turn.reply);
    reply = stripRecordDecisionActions(reply);

    return {
      reply,
      agentId: turn.agentId,
      taskCreated,
    };
  }),
);

const resetHandler = os.commander.reset.handler(({ context }) => {
  clearCommanderAgentId(context.actorId);
  return { ok: true as const };
});

export const commanderHandlers = {
  send: sendHandler,
  reset: resetHandler,
};
