import { describe, expect, it } from "vitest";

import { buildRunPrompt } from "../src/build-run-prompt";

describe("buildRunPrompt", () => {
  it("injects all and agent rules before the task section", () => {
    const prompt = buildRunPrompt({
      title: "phase 8",
      branchName: "feat/phase-8",
      rules: {
        all: ["Always keep diffs minimal."],
        agent: ["Prefer repository patterns."],
      },
    });

    expect(prompt).toContain("# Rules (all)");
    expect(prompt).toContain("Always keep diffs minimal.");
    expect(prompt).toContain("# Rules (agent)");
    expect(prompt).toContain("Prefer repository patterns.");
    expect(prompt.indexOf("# Rules (all)")).toBeLessThan(
      prompt.indexOf("# Rules (agent)"),
    );
    expect(prompt.indexOf("# Rules (agent)")).toBeLessThan(
      prompt.indexOf("# Task"),
    );
    expect(prompt).toContain("Title: phase 8");
    expect(prompt).toContain("Branch: feat/phase-8");
  });

  it("omits empty rules sections", () => {
    const prompt = buildRunPrompt({
      title: "no rules",
      branchName: "feat/no-rules",
    });

    expect(prompt).not.toContain("# Rules (all)");
    expect(prompt).not.toContain("# Rules (agent)");
    expect(prompt.startsWith("# Task")).toBe(true);
  });
});
