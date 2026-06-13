import { execFileSync } from "node:child_process";
import fs, { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type BareRepoFixture = {
  bareDir: string;
  remoteUrl: string;
  baseBranch: string;
  cleanup: () => void;
};

export function createBareRepoFixture(): BareRepoFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "git-ops-bare-"));
  const bareDir = path.join(root, "remote.git");
  const workDir = path.join(root, "seed");
  const baseBranch = "main";

  execFileSync("git", ["init", "--bare", bareDir], { stdio: "pipe" });
  mkdirSync(workDir, { recursive: true });
  execFileSync("git", ["init", "-b", baseBranch], {
    cwd: workDir,
    stdio: "pipe",
  });
  execFileSync("git", ["config", "user.email", "e2e@test"], {
    cwd: workDir,
    stdio: "pipe",
  });
  execFileSync("git", ["config", "user.name", "E2E"], {
    cwd: workDir,
    stdio: "pipe",
  });
  fs.writeFileSync(path.join(workDir, "README.md"), "# fixture\n");
  execFileSync("git", ["add", "README.md"], { cwd: workDir, stdio: "pipe" });
  execFileSync("git", ["commit", "-m", "init"], {
    cwd: workDir,
    stdio: "pipe",
  });
  execFileSync("git", ["remote", "add", "origin", bareDir], {
    cwd: workDir,
    stdio: "pipe",
  });
  execFileSync("git", ["push", "-u", "origin", baseBranch], {
    cwd: workDir,
    stdio: "pipe",
  });

  return {
    bareDir,
    remoteUrl: bareDir,
    baseBranch,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true });
    },
  };
}
