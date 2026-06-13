import { describe, expect, it } from "vitest";

import {
  createRequestLogger,
  getLogger,
  getRequestStore,
  logger,
  runWithRequestStore,
} from "../src";

describe("request store", () => {
  it("returns undefined outside a request scope", () => {
    expect(getRequestStore()).toBeUndefined();
  });

  it("falls back to the root logger when no store is bound", () => {
    expect(getLogger()).toBe(logger);
  });

  it("exposes the bound store inside runWithRequestStore", async () => {
    const store = {
      requestId: "REQ123",
      actorId: null,
      logger: createRequestLogger({ requestId: "REQ123", actorId: null }),
    };
    await runWithRequestStore(store, async () => {
      expect(getRequestStore()?.requestId).toBe("REQ123");
      expect(getLogger()).toBe(store.logger);
    });
  });
});
