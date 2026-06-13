"use client";

import { SUBSCRIPTION_EVENT_TYPES } from "@new-cursor/orpc-contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpcBrowser } from "@/lib/orpc/client.browser";

import { toggleSubscriptionEventType } from "./agent-subscription-event-types";

export function AgentsSettingsPage() {
  const queryClient = useQueryClient();
  const agentsQuery = useQuery({
    queryKey: ["agents.list"],
    queryFn: () => orpcBrowser.agents.list({ limit: 100 }),
  });
  const subscriptionsQuery = useQuery({
    queryKey: ["subscriptions.list"],
    queryFn: () => orpcBrowser.subscriptions.list({ limit: 100 }),
  });

  const upsertMutation = useMutation({
    mutationFn: (input: { agentId: string; eventTypes: string[] }) =>
      orpcBrowser.subscriptions.upsert(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subscriptions.list"] });
    },
  });

  const agents = agentsQuery.data?.rows ?? [];
  const subscriptionsByAgentId = new Map(
    (subscriptionsQuery.data?.rows ?? []).map((subscription) => [
      subscription.agentId,
      subscription,
    ]),
  );
  const loading = agentsQuery.isLoading || subscriptionsQuery.isLoading;
  const hasError = agentsQuery.isError || subscriptionsQuery.isError;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h1 className="text-sm font-semibold text-zinc-900">エージェント設定</h1>
        <p className="mt-1 text-xs text-zinc-500">
          ワーカー用エージェントが購読するイベント種別を設定します。
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <p className="text-xs text-zinc-500">読み込み中…</p>
        ) : hasError ? (
          <p className="text-xs text-red-600" role="alert">
            エージェント設定の取得に失敗しました。
          </p>
        ) : agents.length === 0 ? (
          <p className="text-xs text-zinc-500">
            登録されているエージェントはありません。
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {agents.map((agent) => {
              const subscription = subscriptionsByAgentId.get(agent.id);
              const eventTypes = subscription?.eventTypes ?? [];
              const saving =
                upsertMutation.isPending &&
                upsertMutation.variables?.agentId === agent.id;

              return (
                <li key={agent.id} className="px-4 py-3">
                  <div className="mb-2">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {agent.name}
                    </p>
                    {agent.description ? (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {agent.description}
                      </p>
                    ) : null}
                  </div>
                  <fieldset
                    disabled={saving}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    <legend className="sr-only">
                      {agent.name} の購読イベント
                    </legend>
                    {SUBSCRIPTION_EVENT_TYPES.map((eventType) => {
                      const checked = eventTypes.includes(eventType);
                      return (
                        <label
                          key={eventType}
                          className="flex items-center gap-2 text-xs text-zinc-700"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              upsertMutation.mutate({
                                agentId: agent.id,
                                eventTypes: toggleSubscriptionEventType(
                                  eventTypes,
                                  eventType,
                                  event.target.checked,
                                ),
                              });
                            }}
                          />
                          <span>{eventType}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
