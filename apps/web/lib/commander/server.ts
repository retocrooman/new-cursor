import { getCommanderAgentOverride } from "./index";
import type { CommanderAgentPort } from "./port";
import { StubCommanderAgent } from "./stub-agent";

export async function createCommanderAgent(): Promise<CommanderAgentPort> {
  const agentOverride = getCommanderAgentOverride();
  if (agentOverride) {
    return agentOverride;
  }
  if (process.env.NODE_ENV === "test" || !process.env.CURSOR_API_KEY) {
    return new StubCommanderAgent();
  }
  const { LiveCommanderAgent } = await import("./live-agent");
  return new LiveCommanderAgent();
}
