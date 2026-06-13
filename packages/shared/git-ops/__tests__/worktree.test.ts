import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBareRepoFixture } from "../src/bare-repo-fixture";
import { ensureRepositoryClone } from "../src/clone";
import { createTaskWorktree } from "../src/worktree";

describe("createTaskWorktree", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("creates a branch worktree under WORKTREE_ROOT", async () => {
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const cloneRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "git-ops-clone-root-"),
    );
    const worktreeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "git-ops-worktree-root-"),
    );
    cleanups.push(() => fs.rmSync(cloneRoot, { recursive: true, force: true }));
    cleanups.push(() =>
      fs.rmSync(worktreeRoot, { recursive: true, force: true }),
    );

    const repositoryId = "22222222-2222-4222-8222-222222222222";
    const taskId = "33333333-3333-4333-8333-333333333333";
    const { clonePath } = await ensureRepositoryClone({
      cloneRoot,
      repositoryId,
      remoteUrl: fixture.remoteUrl,
      existingClonePath: null,
    });

    const { worktreePath } = await createTaskWorktree({
      worktreeRoot,
      clonePath,
      taskId,
      branchName: "feat/phase-6",
      baseBranch: fixture.baseBranch,
    });

    expect(fs.existsSync(worktreePath)).toBe(true);
    expect(fs.existsSync(path.join(worktreePath, "README.md"))).toBe(true);
  });
});
