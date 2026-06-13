const agentIdsByUser = new Map<string, string>();

export function getCommanderAgentId(userId: string): string | undefined {
  return agentIdsByUser.get(userId);
}

export function setCommanderAgentId(userId: string, agentId: string): void {
  agentIdsByUser.set(userId, agentId);
}

export function clearCommanderAgentId(userId: string): void {
  agentIdsByUser.delete(userId);
}

export function clearAllCommanderSessionsForTests(): void {
  agentIdsByUser.clear();
}
