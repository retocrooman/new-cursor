import type { CommanderAgentPort } from "./port";

let agentOverride: CommanderAgentPort | undefined;

export function setCommanderAgentForTests(
  agent: CommanderAgentPort | undefined,
): void {
  agentOverride = agent;
}

export function getCommanderAgentOverride(): CommanderAgentPort | undefined {
  return agentOverride;
}

export {
  parseCreateTaskAction,
  stripCreateTaskAction,
} from "./parse-task-action";
export type { CommanderAgentPort, CommanderTurnResult } from "./port";
export { resolveRepoRoot } from "./repo-root";
export {
  clearAllCommanderSessionsForTests,
  clearCommanderAgentId,
  getCommanderAgentId,
  setCommanderAgentId,
} from "./session-store";
export type { StubCommanderAgentOptions } from "./stub-agent";
export { StubCommanderAgent } from "./stub-agent";
export { buildCommanderSystemPrompt } from "./system-prompt";
