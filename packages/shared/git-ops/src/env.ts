import path from "node:path";

export type GitOpsRoots = {
  cloneRoot: string;
  worktreeRoot: string;
  defaultBaseBranch: string;
};

export function gitOpsRootsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): GitOpsRoots {
  const cloneRoot =
    env.CLONE_ROOT ?? path.join(process.cwd(), ".data", "clones");
  const worktreeRoot =
    env.WORKTREE_ROOT ?? path.join(process.cwd(), ".data", "worktrees");
  return {
    cloneRoot,
    worktreeRoot,
    defaultBaseBranch: env.DEFAULT_BASE_BRANCH ?? "main",
  };
}
