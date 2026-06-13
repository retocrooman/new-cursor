"use client";

import {
  AGENT_MODEL_OPTIONS,
  resolveAgentModelId,
} from "@new-cursor/orpc-contract";
import { Select } from "@new-cursor/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpcBrowser } from "@/lib/orpc/client.browser";

export function AgentsSettingsPage() {
  const queryClient = useQueryClient();
  const agentsQuery = useQuery({
    queryKey: ["agents.list"],
    queryFn: () => orpcBrowser.agents.list({ limit: 100 }),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; modelId: string | null }) =>
      orpcBrowser.agents.update(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agents.list"] });
    },
  });

  const agents = agentsQuery.data?.rows ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-semibold text-foreground">
          エージェント設定
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          ワーカー用エージェントのモデルを設定します。
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {agentsQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">読み込み中…</p>
        ) : agentsQuery.isError ? (
          <p className="text-xs text-destructive" role="alert">
            エージェント一覧の取得に失敗しました。
          </p>
        ) : agents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            登録されているエージェントはありません。
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {agents.map((agent) => {
              const currentModelId = resolveAgentModelId(agent.modelId);
              const saving =
                updateMutation.isPending &&
                updateMutation.variables?.id === agent.id;

              return (
                <li
                  key={agent.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {agent.name}
                    </p>
                    {agent.description ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {agent.description}
                      </p>
                    ) : null}
                  </div>
                  <Select
                    aria-label={`${agent.name} のモデル`}
                    value={currentModelId}
                    disabled={saving}
                    onChange={(event) => {
                      updateMutation.mutate({
                        id: agent.id,
                        modelId: event.target.value,
                      });
                    }}
                    className="w-44 shrink-0"
                  >
                    {AGENT_MODEL_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
