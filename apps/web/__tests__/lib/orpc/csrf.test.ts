import type { Auth } from "@new-cursor/auth";
import type { Database } from "@new-cursor/db";
import { RPCHandler } from "@orpc/server/fetch";
import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";
import { describe, expect, it } from "vitest";

import type { OrpcContext } from "@/lib/orpc/context";
import { router } from "@/lib/orpc/router";

/**
 * CSRF 防御の検証。custom header が無いリクエストは 403 で弾かれ、
 * `x-csrf-token: orpc`（orpcBrowser の link plugin が自動付与する値）が付いていれば
 * CSRF チェックを通過することを確認する。
 */
const handler = new RPCHandler(router, {
  plugins: [new SimpleCsrfProtectionHandlerPlugin()],
});

// health は os.ts の base middleware（actorId 必須）を通すため、認証済み相当の
// context を渡す。CSRF プラグインの header チェックは認証より手前で走る。
const context: OrpcContext = {
  db: {} as unknown as Database,
  actorId: "00000000-0000-0000-0000-000000000001",
  role: "admin",
  auth: {} as unknown as Auth,
  request: null,
};

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/rpc/health", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({}),
  });
}

describe("RPC handler CSRF protection", () => {
  it("rejects a request without the csrf header (403)", async () => {
    const { response } = await handler.handle(makeRequest({}), {
      prefix: "/api/rpc",
      context,
    });
    expect(response?.status).toBe(403);
  });

  it("allows a request carrying the csrf header", async () => {
    const { matched, response } = await handler.handle(
      makeRequest({ "x-csrf-token": "orpc" }),
      { prefix: "/api/rpc", context },
    );
    expect(matched).toBe(true);
    expect(response?.status).not.toBe(403);
  });
});
