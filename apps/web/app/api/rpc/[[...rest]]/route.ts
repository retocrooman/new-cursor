import { createRequestLogger, runWithRequestStore } from "@new-cursor/logger";
import { generateRequestId } from "@new-cursor/utils";
import { RPCHandler } from "@orpc/server/fetch";
import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";

import { createOrpcContextFromRequest } from "@/lib/orpc/context";
import { requestLoggerInterceptor } from "@/lib/orpc/interceptors";
import { router } from "@/lib/orpc/router";

// Drizzle / postgres.js は Node.js runtime 必須（Edge 不可）。
export const runtime = "nodejs";
// oRPC 呼び出しは常に動的（events 追加 / projection 更新を伴う）。
export const dynamic = "force-dynamic";

const REQUEST_ID_HEADER = "x-request-id";

// CSRF 防御: oRPC の RPCHandler は content-type 無し / application/json の body を
// JSON として読むため、custom header の付かない cross-site の "simple request"
// （typeless Blob を body にした fetch 等、CORS preflight を踏まない経路）が cookie
// 付きで write procedure を叩けてしまう。SimpleCsrfProtectionHandlerPlugin は
// `x-csrf-token: orpc` header を要求し、cross-site の simple request では付与できない
// （custom header は preflight を誘発し CORS で弾かれる）ため、この経路を塞ぐ。
// 正規の呼び出し（orpcBrowser の RPCLink）は対の link plugin が header を自動付与する。
const handler = new RPCHandler(router, {
  plugins: [new SimpleCsrfProtectionHandlerPlugin()],
  rootInterceptors: [requestLoggerInterceptor],
});

async function handleRequest(request: Request): Promise<Response> {
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();

  // `actorId` は session 解決まで null で出発し、`createOrpcContextFromRequest` 内で
  // store を直接 mutate して child logger を再 binding する。
  return runWithRequestStore(
    {
      requestId,
      actorId: null,
      logger: createRequestLogger({ requestId, actorId: null }),
    },
    async () => {
      const context = await createOrpcContextFromRequest(request);
      const { matched, response } = await handler.handle(request, {
        prefix: "/api/rpc",
        context,
      });

      if (matched && response) {
        response.headers.set(REQUEST_ID_HEADER, requestId);
        return response;
      }
      return new Response("Not Found", {
        status: 404,
        headers: { [REQUEST_ID_HEADER]: requestId },
      });
    },
  );
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const HEAD = handleRequest;
export const OPTIONS = handleRequest;
