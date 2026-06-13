"use client";

import { Button, Input } from "@new-cursor/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { useRef, useState } from "react";

import { orpcBrowser } from "@/lib/orpc/client.browser";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function CommanderPanel() {
  const [, setSelectedId] = useQueryState(
    "id",
    parseAsString.withOptions({ shallow: true }),
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      orpcBrowser.commander.send({
        message,
        agentId,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">司令官</h2>
          <p className="mt-0.5 text-xs text-zinc-500">起票チャット</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resetMutation.mutate()}
          loading={resetMutation.isPending}
          disabled={messages.length === 0}
        >
          リセット
        </Button>
      </header>
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-zinc-500">
            司令官にタスク起票を相談できます。タイトル・ブランチ・背景などを確認してから起票します。
          </p>
        ) : null}
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={
              msg.role === "user"
                ? "ml-6 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900"
                : "mr-2 rounded-lg bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm ring-1 ring-zinc-200"
            }
          >
            {msg.content}
          </div>
        ))}
        {sendMutation.isError ? (
          <p className="text-xs text-red-600" role="alert">
            送信に失敗しました。再試行してください。
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-2 border-t border-zinc-200 p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力…"
          disabled={sendMutation.isPending}
          aria-label="司令官へのメッセージ"
        />
        <Button
          type="submit"
          size="sm"
          loading={sendMutation.isPending}
          disabled={!input.trim()}
          className="w-full"
        >
          送信
        </Button>
      </form>
    </div>
  );
}
