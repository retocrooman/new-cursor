import { describe, expect, it } from "vitest";

import { StubCursorSdkAdapter } from "../src/stub-adapter";

describe("StubCursorSdkAdapter", () => {
  it("records cwd and returns success by default", async () => {
    const adapter = new StubCursorSdkAdapter();
    const result = await adapter.execute({
      cwd: "/tmp/worktree",
      prompt: "do work",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cursorAgentId).toBe("agent-stub-success");
    }
    expect(adapter.lastCwd).toBe("/tmp/worktree");
    expect(adapter.lastPrompt).toBe("do work");
  });

  it("returns failure when configured", async () => {
    const adapter = new StubCursorSdkAdapter({
      shouldFail: true,
      errorMessage: "boom",
    });
    const result = await adapter.execute({
      cwd: "/tmp/worktree",
      prompt: "do work",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("boom");
    }
  });
});
