"use client";

import {
  AGENT_MODEL_OPTIONS,
  resolveAgentModelId,
} from "@new-cursor/orpc-contract";
import { Popover } from "@new-cursor/ui";
import { useState } from "react";

type Props = {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3 shrink-0 opacity-60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>展開</title>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3 shrink-0 text-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>選択中</title>
      <path d="M3.5 8.5l3 3 6-6" />
    </svg>
  );
}

export function AgentModelPicker({
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel = "モデルを選択",
}: Props) {
  const [open, setOpen] = useState(false);
  const resolvedId = resolveAgentModelId(value);
  const selected =
    AGENT_MODEL_OPTIONS.find((option) => option.id === resolvedId) ??
    AGENT_MODEL_OPTIONS[0];

  function handleSelect(nextId: string) {
    onChange(nextId);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="top-start"
      ariaLabel={ariaLabel}
      contentClassName="min-w-[11rem] border-border bg-panel p-1 shadow-lg"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          onClick={() => {
            if (!disabled) setOpen(!open);
          }}
          className="inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{selected.label}</span>
          <ChevronDownIcon />
        </button>
      )}
    >
      <div role="listbox" aria-label={ariaLabel} className="space-y-0.5">
        {AGENT_MODEL_OPTIONS.map((option) => {
          const isSelected = option.id === resolvedId;
          return (
            <div key={option.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.id)}
                className={
                  isSelected
                    ? "flex w-full items-center justify-between gap-2 rounded-sm bg-selected px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-selected-hover"
                    : "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                }
              >
                <span>{option.label}</span>
                {isSelected ? <CheckIcon /> : null}
              </button>
            </div>
          );
        })}
      </div>
    </Popover>
  );
}
