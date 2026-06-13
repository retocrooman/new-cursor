import { generateRequestId } from "@new-cursor/utils";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 の Proxy（旧 middleware）規約。
 *
 * 役割は 2 つ:
 * 1. **UX レイヤーの認可ガード**: 管理画面パスで session cookie が無ければ `/login` に
 *    向ける（cookie の存在のみで真の認可は行わない）。
 * 2. **request ID 伝播**: ULID 風の ID を生成して上流ヘッダに乗せ、レスポンスヘッダにも
 *    echo する（AsyncLocalStorage の RequestStore で再利用）。
 *
 * 真の認可は以下 2 か所で行う:
 * - `/api/rpc/*` の handler 入口（`os.ts` の base middleware が `actorId` を検証）
 * - Server Component の page / layout（`getSession` を必ず呼ぶ約束）
 *
 * Edge Runtime 制約下で DB 接続を持ち込まないため、ここでは cookie の **存在** だけを
 * 見る。Cookie 名は better-auth の仕様に従い、HTTPS では `__Secure-` prefix が付く。
 */
const REQUEST_ID_HEADER = "x-request-id";
const PATHNAME_HEADER = "x-pathname";

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  if (!hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/") {
      loginUrl.searchParams.set("from", request.nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const incomingId = request.headers.get(REQUEST_ID_HEADER);
  const requestId =
    incomingId && incomingId.length > 0 ? incomingId : generateRequestId();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  // layout / page から現在のパスを参照できるよう、proxy で path を注入する。
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|login|api/auth|api/rpc).*)",
  ],
};
