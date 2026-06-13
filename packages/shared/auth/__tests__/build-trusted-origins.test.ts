import { describe, expect, it } from "vitest";

import { buildTrustedOrigins } from "../src";

describe("buildTrustedOrigins", () => {
  it("places baseURL first and dedupes", () => {
    expect(
      buildTrustedOrigins("http://localhost:3000", [
        "https://app.example.com",
        "http://localhost:3000",
      ]),
    ).toEqual(["http://localhost:3000", "https://app.example.com"]);
  });

  it("drops empty baseURL", () => {
    expect(buildTrustedOrigins("", ["https://app.example.com"])).toEqual([
      "https://app.example.com",
    ]);
  });
});
