import { Agent } from "@cursor/sdk";

import type { CursorRunInput, CursorRunResult, CursorSdkPort } from "./port";

export class LiveCursorSdkAdapter implements CursorSdkPort {
  async execute(input: CursorRunInput): Promise<CursorRunResult> {
    const apiKey = input.apiKey;
    if (!apiKey) {
      return { ok: false, error: "CURSOR_API_KEY is required for live SDK" };
    }

    try {
      await using agent = await Agent.create({
        apiKey,
        model: {
          id: input.modelId ?? process.env.COMMANDER_MODEL_ID ?? "composer-2.5",
        },
        local: { cwd: input.cwd, autoReview: false },
      });

      const run = await agent.send(input.prompt);
      const result = await run.wait();

      if (result.status === "error" || result.status === "cancelled") {
        return {
          ok: false,
          cursorAgentId: agent.agentId,
          error: result.result ?? `run finished with ${result.status} status`,
        };
      }

      return {
        ok: true,
        cursorAgentId: agent.agentId,
        summary:
          typeof result.result === "string" ? result.result : "run completed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  }
}
