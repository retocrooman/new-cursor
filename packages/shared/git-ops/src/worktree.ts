import { execFileSync } from "node:child_process";
import fs, { mkdirSync } from "node:fs";
import path from "node:path";

export async function createTaskWorktree(input: {
  worktreeRoot: string;
  clonePath: string;
  taskId: string;
  branchName: string;
  baseBranch: string;
}): Promise<{ worktreePath: string }> {
  const worktreePath = path.join(input.worktreeRoot, input.taskId);
  if (fs.existsSync(worktreePath)) {
    return { worktreePath };
  }

  mkdirSync(input.worktreeRoot, { recursive: true });
  execFileSync(
    "git",
    [
      "-C",
      input.clonePath,
      "worktree",
      "add",
      "-B",
      input.branchName,
      worktreePath,
      input.baseBranch,
    ],
    { stdio: "pipe" },
  );

  return { worktreePath };
}

export async function removeTaskWorktree(input: {
  clonePath: string;
  worktreePath: string;
}): Promise<void> {
  if (!fs.existsSync(input.worktreePath)) {
    return;
  }

  execFileSync(
    "git",
    [
      "-C",
      input.clonePath,
      "worktree",
      "remove",
      "--force",
      input.worktreePath,
    ],
    { stdio: "pipe" },
  );
}
