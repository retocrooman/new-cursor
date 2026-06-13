import type { CursorRunInput, CursorRunResult, CursorSdkPort } from "./port";

export type StubCursorSdkOptions = {
  shouldFail?: boolean;
  errorMessage?: string;
  cursorAgentId?: string;
  summary?: string;
};

export class StubCursorSdkAdapter implements CursorSdkPort {
  lastCwd: string | null = null;
  lastPrompt: string | null = null;
  callCount = 0;

  constructor(private readonly options: StubCursorSdkOptions = {}) {}

  async execute(input: CursorRunInput): Promise<CursorRunResult> {
    this.callCount += 1;
    this.lastCwd = input.cwd;
    this.lastPrompt = input.prompt;

    if (this.options.shouldFail) {
      return {
        ok: false,
        cursorAgentId: this.options.cursorAgentId ?? "agent-stub-fail",
        error: this.options.errorMessage ?? "stub execution failed",
      };
    }

    return {
      ok: true,
      cursorAgentId: this.options.cursorAgentId ?? "agent-stub-success",
      summary: this.options.summary ?? "stub run completed",
    };
  }
}
