import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { runAction } from "@/lib/orpc/action-result";

describe("runAction", () => {
  it("wraps a successful result", async () => {
    const result = await runAction(async () => ({ id: "1" }));
    expect(result).toEqual({ ok: true, data: { id: "1" } });
  });

  it("maps NOT_FOUND", async () => {
    const result = await runAction(async () => {
      throw new ORPCError("NOT_FOUND", { message: "missing" });
    });
    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("maps a version CONFLICT to refetched latest", async () => {
    const result = await runAction(
      async () => {
        throw new ORPCError("CONFLICT", { message: "stale" });
      },
      { fetchLatestOnConflict: async () => ({ version: 2 }) },
    );
    expect(result).toEqual({
      ok: false,
      reason: "CONFLICT",
      latest: { version: 2 },
    });
  });

  it("demotes a domain CONFLICT (with data) to ERROR", async () => {
    const result = await runAction(async () => {
      throw new ORPCError("CONFLICT", {
        message: "has refs",
        data: { childCount: 3 },
      });
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "ERROR",
      data: { childCount: 3 },
    });
  });

  it("keeps intentional domain (BAD_REQUEST) messages", async () => {
    const result = await runAction(async () => {
      throw new ORPCError("BAD_REQUEST", {
        message: "自分自身は無効化できません",
      });
    });
    expect(result).toEqual({
      ok: false,
      reason: "ERROR",
      message: "自分自身は無効化できません",
    });
  });

  it("collapses INTERNAL_SERVER_ERROR to a generic message (no internal leak)", async () => {
    const secret = "better-auth internal stack detail";
    const result = await runAction(async () => {
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: secret });
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "ERROR") {
      expect(result.message).not.toContain(secret);
    } else {
      throw new Error("expected ERROR result");
    }
  });

  it("collapses a non-ORPCError to a generic message (no internal leak)", async () => {
    const secret = "raw internal exception text";
    const result = await runAction(async () => {
      throw new Error(secret);
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "ERROR") {
      expect(result.message).not.toContain(secret);
    } else {
      throw new Error("expected ERROR result");
    }
  });
});
