export type PendingRunExecution = {
  runId: string;
  taskId: string;
  agentId: string;
  worktreePath: string;
  title: string;
  branchName: string;
  prompt: string;
  taskVersion: number;
};
