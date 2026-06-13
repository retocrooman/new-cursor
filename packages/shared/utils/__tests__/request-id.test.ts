import { describe, expect, it } from "vitest";

import { generateRequestId, isDefined } from "../src";

describe("generateRequestId", () => {
  it("returns a 26-char uppercase token", () => {
    const id = generateRequestId();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-Z]{26}$/);
  });

  it("returns distinct values across calls", () => {
    expect(generateRequestId()).not.toBe(generateRequestId());
  });
});

describe("isDefined", () => {
  it("filters out undefined", () => {
    const result = [1, undefined, 2].filter(isDefined);
    expect(result).toEqual([1, 2]);
  });
});
