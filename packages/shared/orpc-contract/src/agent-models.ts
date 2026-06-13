export const AGENT_MODEL_OPTIONS = [
  { id: "composer-2.5", label: "Composer 2.5" },
  { id: "composer-2.5-fast", label: "Composer 2.5 Fast" },
  { id: "gpt-5.5-high", label: "GPT 5.5 High" },
] as const;

export type AgentModelId = (typeof AGENT_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_AGENT_MODEL_ID: AgentModelId = "composer-2.5";

export function resolveAgentModelId(
  modelId: string | null | undefined,
  fallback: string = DEFAULT_AGENT_MODEL_ID,
): string {
  if (!modelId) return fallback;
  return AGENT_MODEL_OPTIONS.some((option) => option.id === modelId)
    ? modelId
    : fallback;
}
