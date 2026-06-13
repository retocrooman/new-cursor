"use client";

import {
  DEFAULT_AGENT_MODEL_ID,
  resolveAgentModelId,
} from "@new-cursor/orpc-contract";
import { Button, Spinner } from "@new-cursor/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";

import { orpcBrowser } from "@/lib/orpc/client.browser";

import { AgentModelPicker } from "./AgentModelPicker";

const COMMANDER_MODEL_STORAGE_KEY = "commander-model-id";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function getStoredCommanderModelId(): string {
  if (typeof window === "undefined") return DEFAULT_AGENT_MODEL_ID;
  const stored = localStorage.getItem(COMMANDER_MODEL_STORAGE_KEY);
  return resolveAgentModelId(stored);
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <title>送信</title>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function CommanderPanel() {
  const [selectedId, setSelectedId] = useQueryState(
    "id",
    parseAsString.withOptions({ shallow: true }),
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>(DEFAULT_AGENT_MODEL_ID);
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setModelId(getStoredCommanderModelId());
  }, []);

  function handleModelChange(nextModelId: string) {
    const resolved = resolveAgentModelId(nextModelId);
    setModelId(resolved);
    localStorage.setItem(COMMANDER_MODEL_STORAGE_KEY, resolved);
  }

  const selectedTaskQuery = useQuery({
    queryKey: ["tasks.get", selectedId],
    queryFn: () => orpcBrowser.tasks.get({ id: selectedId! }),
    enabled: Boolean(selectedId),
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      orpcBrowser.commander.send({
        message,
        agentId,
        modelId,
        taskId: selectedId ?? null,
      }),
    onSuccess: (result, message) => {
      setAgentId(result.agentId);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: result.reply },
      ]);
      setInput("");
      if (result.taskCreated) {
        void queryClient.invalidateQueries({ queryKey: ["tasks.list"] });
        void queryClient.invalidateQueries({
          queryKey: ["tasks.get", result.taskCreated.id],
        });
        void setSelectedId(result.taskCreated.id);
      }
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => orpcBrowser.commander.reset(),
    onSuccess: () => {
      setAgentId(null);
      setMessages([]);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }

  const canSend = Boolean(input.trim()) && !sendMutation.isPending;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">司令官</h2>
          <p className="text-[11px] text-muted-foreground">起票チャット</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetMutation.mutate()}
            loading={resetMutation.isPending}
            disabled={messages.length === 0}
          >
            リセット
          </Button>
        </div>
      </header>
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            司令官にタスク起票を相談できます。タイトル・ブランチ・背景などを確認してから起票します。
          </p>
        ) : null}
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={
              msg.role === "user"
                ? "ml-6 rounded-lg bg-chat-user px-2.5 py-1.5 text-xs text-chat-user-foreground"
                : "mr-2 rounded-lg bg-chat-assistant px-2.5 py-1.5 text-xs text-chat-assistant-foreground shadow-sm ring-1 ring-border"
            }
          >
            {msg.content}
          </div>
        ))}
        {sendMutation.isError ? (
          <p className="text-xs text-destructive" role="alert">
            送信に失敗しました。再試行してください。
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full border-t border-border px-4 py-1.5"
      >
        {selectedTaskQuery.data ? (
          <p className="mb-1 text-[10px] text-muted-foreground">
            コンテキスト: {selectedTaskQuery.data.title}
          </p>
        ) : null}
        <div className="flex h-7 w-full min-w-0 items-center gap-1 rounded-sm border border-border bg-input pl-1 pr-0.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-1 focus-within:ring-ring/40">
          <div className="shrink-0">
            <AgentModelPicker
              aria-label="司令官のモデル"
              value={modelId}
              onChange={handleModelChange}
              disabled={sendMutation.isPending}
            />
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力…"
            disabled={sendMutation.isPending}
            aria-label="司令官へのメッセージ"
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="送信"
            disabled={!canSend}
            className="flex size-5 shrink-0 items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sendMutation.isPending ? <Spinner size="xs" /> : <PlusIcon />}
          </button>
        </div>
      </form>
    </div>
  );
}
