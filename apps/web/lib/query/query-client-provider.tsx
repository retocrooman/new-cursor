"use client";

import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { useState } from "react";

/**
 * QueryClient はマウントごとに 1 つだけ作る（`useState` の lazy init）。
 *
 * defaultOptions は admin 全体の挙動を決める:
 *  - staleTime: 30s / gcTime: 5min / refetchOnWindowFocus: false
 *  - retry: UNAUTHORIZED は即時失敗（`client.browser.ts` が /login に hard redirect する
 *    ため、リトライすると redirect が遅延する）、その他は 1 回まで。
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ORPCError && error.code === "UNAUTHORIZED") {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  });
}

type Props = {
  children: ReactNode;
};

export function AppQueryClientProvider({ children }: Props) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV !== "production" ? (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      ) : null}
    </QueryClientProvider>
  );
}
