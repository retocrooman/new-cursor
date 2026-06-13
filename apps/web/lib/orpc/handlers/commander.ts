import type { TaskProjectionDto } from "@new-cursor/orpc-contract";
import { listRepositories } from "@new-cursor/repositories-feature";
import { createRouterClient } from "@orpc/server";

import {
  buildCommanderSystemPrompt,
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

    const { rows: repositories } = await listRepositories(context.db, {
      limit: 100,
    });
    const systemPrompt = buildCommanderSystemPrompt(
      repositories.map((r) => ({ id: r.id, name: r.name })),
    );

    const turn = await agent.sendTurn({
      message: input.message,
      agentId,
      systemPrompt,
      cwd: resolveRepoRoot(),
      apiKey,
    });

    setCommanderAgentId(context.actorId, turn.agentId);

    const action = parseCreateTaskAction(turn.reply);
    let taskCreated: TaskProjectionDto | undefined;

    if (action) {
      const taskClient = createRouterClient(router, {
        context: () => context,
      });
      taskCreated = await taskClient.tasks.create({
        title: action.title,
        branchName: action.branchName ?? null,
        repositoryId: action.repositoryId ?? null,
      });
    }

    return {
      reply: stripCreateTaskAction(turn.reply),
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
