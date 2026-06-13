import { execFileSync } from "node:child_process";
import fs, { mkdirSync } from "node:fs";
import path from "node:path";

export async function ensureRepositoryClone(input: {
  cloneRoot: string;
  repositoryId: string;
  remoteUrl: string;
  existingClonePath: string | null;
}): Promise<{ clonePath: string; cloned: boolean }> {
  if (input.existingClonePath && fs.existsSync(input.existingClonePath)) {
    return { clonePath: input.existingClonePath, cloned: false };
  }

  const clonePath = path.join(input.cloneRoot, input.repositoryId);
  if (fs.existsSync(path.join(clonePath, ".git"))) {
    return { clonePath, cloned: false };
  }

  mkdirSync(input.cloneRoot, { recursive: true });
  execFileSync("git", ["clone", input.remoteUrl, clonePath], {
    stdio: "pipe",
  });

  return { clonePath, cloned: true };
}
