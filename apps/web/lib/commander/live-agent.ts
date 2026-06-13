import "server-only";

import { Agent } from "@cursor/sdk";
import { resolveAgentModelId } from "@new-cursor/orpc-contract";
import type { CommanderAgentPort, CommanderTurnInput } from "./port";

export class LiveCommanderAgent implements CommanderAgentPort {
  async sendTurn(input: CommanderTurnInput) {
    const envDefault = process.env.COMMANDER_MODEL_ID;
    const modelId = resolveAgentModelId(input.modelId, envDefault);
    const baseOptions = {
      apiKey: input.apiKey,
      model: { id: modelId },
      local: { cwd: input.cwd, autoReview: false },
    } as const;

    if (input.agentId) {
      await using agent = await Agent.resume(input.agentId, baseOptions);
      const run = await agent.send(input.message);
      const result = await run.wait();
      return {
        reply: extractReply(result),
        agentId: agent.agentId,
      };
    }

    await using agent = await Agent.create(baseOptions);
    const run = await agent.send(
      `${input.systemPrompt}\n\n---\n\n${input.message}`,
    );
    const result = await run.wait();
    return {
      reply: extractReply(result),
      agentId: agent.agentId,
    };
  }
}

function extractReply(result: { status: string; result?: unknown }): string {
  if (result.status === "error" || result.status === "cancelled") {
    const detail =
      typeof result.result === "string"
        ? result.result
        : `run finished with ${result.status}`;
    throw new Error(detail);
  }
  if (typeof result.result === "string") {
    return result.result;
  }
  return "（応答を取得できませんでした）";
}
