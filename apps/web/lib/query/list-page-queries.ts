"use client";

import {
  keepPreviousData,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * admin 一覧画面で利用する React Query 共通 wrapper 群。
 *
 * 各 *Client.tsx で `useQuery({ queryKey, queryFn, placeholderData })` を手書きせずに
 * `useListQuery` / `useResourceQuery` の 1 行で済むようにする。mutation 後の
 * `invalidateQueries` は `useInvalidateDomain` に集約する。
 */

export function listQueryKey(
  domain: string,
  input: unknown,
): readonly [string, unknown] {
  return [`${domain}.list`, input] as const;
}

export function resourceQueryKey(
  domain: string,
  id: string,
): readonly [string, string] {
  return [`${domain}.get`, id] as const;
}

type UseListQueryInput<TInput, TData> = {
  /** queryKey の prefix に使うドメイン名（例: `items`）。 */
  domain: string;
  /** API 入力（filters / sort / pagination）。安定化する責務は呼び出し側。 */
  input: TInput;
  /** `orpcBrowser.<domain>.list(input)` 等の関数。 */
  fetcher: (input: TInput) => Promise<TData>;
  enabled?: boolean;
};

export type UseListQueryResult<TData> = UseQueryResult<TData> & {
  /** 初回ロード or フィルタ切替で「更新中」を表すフラグ（プログレスバー用）。 */
  isDataUpdating: boolean;
};

/**
 * 一覧 fetch 用の薄い `useQuery` wrapper。`placeholderData: keepPreviousData` を常時
 * 有効化し、フィルタ / ページ切替で前ページ表示を維持しつつ裏で再 fetch する。
 */
export function useListQuery<TInput, TData>({
  domain,
  input,
  fetcher,
  enabled,
}: UseListQueryInput<TInput, TData>): UseListQueryResult<TData> {
  const query = useQuery({
    queryKey: listQueryKey(domain, input),
    queryFn: () => fetcher(input),
    placeholderData: keepPreviousData,
    enabled,
  });
  const isDataUpdating =
    query.isLoading || (query.isFetching && query.isPlaceholderData);
  return Object.assign(query, { isDataUpdating });
}

type UseResourceQueryInput<TData> = {
  domain: string;
  /** 編集中リソースの id。null のときは fetch しない。 */
  id: string | null;
  fetcher: (id: string) => Promise<TData>;
};

/**
 * 編集対象 1 件の詳細 fetch 用 wrapper。`enabled: !!id` で `?id` 不在時は走らない。
 * `retry: false` は NOT_FOUND を即時 isError に倒すため。
 */
export function useResourceQuery<TData>({
  domain,
  id,
  fetcher,
}: UseResourceQueryInput<TData>): UseQueryResult<TData> {
  return useQuery({
    queryKey: resourceQueryKey(domain, id ?? "__noop__"),
    queryFn: () => fetcher(id as string),
    enabled: !!id,
    retry: false,
  });
}

type UseInvalidateDomainInput = {
  domain: string;
  selectedId: string | null;
};

/**
 * mutation 完了時に呼ぶ invalidate callback を返す。
 * `[<domain>.list]` prefix を必ず invalidate し、`selectedId` があれば detail key も。
 */
export function useInvalidateDomain({
  domain,
  selectedId,
}: UseInvalidateDomainInput): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [`${domain}.list`] });
    if (selectedId) {
      void queryClient.invalidateQueries({
        queryKey: resourceQueryKey(domain, selectedId),
      });
    }
  }, [queryClient, domain, selectedId]);
}
