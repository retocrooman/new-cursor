import type { Contract } from "@new-cursor/orpc-contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import type { ContractRouterClient } from "@orpc/contract";

import { env } from "../env";

import { redirectToLoginOnUnauthorized } from "./unauthorized-redirect";

// Client Components から oRPC を同オリジン経由で呼ぶ。
// ブラウザ実行時は window.location.origin を優先し、SSR 経路では NEXT_PUBLIC_APP_URL を
// ベースに絶対 URL を組み立てる。
//
// `fetch` を override して 401 (UNAUTHORIZED) を検知し `/login?from=<現在パス>` に hard
// redirect する。`/login` 上では無限ループ防止で skip する。
const link = new RPCLink({
  url: () =>
    typeof window === "undefined"
      ? `${env.NEXT_PUBLIC_APP_URL}/api/rpc`
      : `${window.location.origin}/api/rpc`,
  fetch: async (request, init) => {
    const response = await fetch(request, init);
    if (response.status === 401) {
      redirectToLoginOnUnauthorized();
    }
    return response;
  },
  // server 側の SimpleCsrfProtectionHandlerPlugin と対。`x-csrf-token: orpc` を
  // 全リクエストに自動付与する（cross-site の simple request では付けられない header）。
  plugins: [new SimpleCsrfProtectionLinkPlugin()],
});

export const orpcBrowser: ContractRouterClient<Contract> =
  createORPCClient(link);
