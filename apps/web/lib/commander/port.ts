export type CommanderTurnInput = {
  message: string;
  agentId?: string;
  systemPrompt: string;
  cwd: string;
  apiKey: string;
};

export type CommanderTurnResult = {
  reply: string;
  agentId: string;
};

export interface CommanderAgentPort {
  sendTurn(input: CommanderTurnInput): Promise<CommanderTurnResult>;
}
