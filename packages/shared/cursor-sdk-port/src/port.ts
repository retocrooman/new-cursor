export type CursorRunInput = {
  cwd: string;
  prompt: string;
  apiKey?: string;
  modelId?: string;
};

export type CursorRunSuccess = {
  ok: true;
  cursorAgentId: string;
  summary?: string;
};

export type CursorRunFailure = {
  ok: false;
  cursorAgentId?: string;
  error: string;
};

export type CursorRunResult = CursorRunSuccess | CursorRunFailure;

export interface CursorSdkPort {
  execute(input: CursorRunInput): Promise<CursorRunResult>;
}
