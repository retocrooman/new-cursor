import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBareRepoFixture } from "../src/bare-repo-fixture";
import { ensureRepositoryClone } from "../src/clone";

describe("ensureRepositoryClone", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("clones an external repository lazily", async () => {
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const cloneRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "git-ops-clone-root-"),
    );
    cleanups.push(() => fs.rmSync(cloneRoot, { recursive: true, force: true }));

    const first = await ensureRepositoryClone({
      cloneRoot,
      repositoryId: "11111111-1111-4111-8111-111111111111",
      remoteUrl: fixture.remoteUrl,
      existingClonePath: null,
    });
    expect(first.cloned).toBe(true);
    expect(fs.existsSync(path.join(first.clonePath, ".git"))).toBe(true);

    const second = await ensureRepositoryClone({
      cloneRoot,
      repositoryId: "11111111-1111-4111-8111-111111111111",
      remoteUrl: fixture.remoteUrl,
      existingClonePath: first.clonePath,
    });
    expect(second.cloned).toBe(false);
    expect(second.clonePath).toBe(first.clonePath);
  });
});
