import type { CommanderAgentPort, CommanderTurnInput } from "./port";

export type StubCommanderAgentOptions = {
  reply?: string;
  shouldFail?: boolean;
  errorMessage?: string;
};

export class StubCommanderAgent implements CommanderAgentPort {
  lastInput: CommanderTurnInput | null = null;
  callCount = 0;

  constructor(private readonly options: StubCommanderAgentOptions = {}) {}

  async sendTurn(input: CommanderTurnInput) {
    this.callCount += 1;
    this.lastInput = input;

    if (this.options.shouldFail) {
      throw new Error(this.options.errorMessage ?? "stub commander failed");
    }

    const agentId = input.agentId ?? "agent-stub-commander";
    const reply =
      this.options.reply ??
      `了解しました。起票内容を確認してください。\n{"action":"create_task","title":"Stub task","branchName":"feat/stub","repositoryId":null}`;

    return { reply, agentId };
  }
}
