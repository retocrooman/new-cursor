import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Database } from "@new-cursor/db";
import {
  processDeliveryMessages,
  relayPendingOutbox,
} from "@new-cursor/delivery-feature";
import type { SqsEnv } from "@new-cursor/utils";
import { dispatchToSubscribers } from "@new-cursor/worker-dispatch-feature";

export async function relayAndDispatchAll(input: {
  db: Database;
  sqs: SqsEnv;
  maxRounds?: number;
}): Promise<void> {
  const maxRounds = input.maxRounds ?? 5;
  for (let round = 0; round < maxRounds; round += 1) {
    const relayResult = await relayPendingOutbox({
      db: input.db,
      sqs: input.sqs,
    });
    if (relayResult.published === 0) {
      break;
    }

    const processResult = await processDeliveryMessages({
      db: input.db,
      sqs: input.sqs,
      dispatch: async (tx, message) => {
        await dispatchToSubscribers(tx, message);
      },
    });
    if (processResult.processed === 0 && processResult.failed > 0) {
      throw new Error("E2E delivery processing failed");
    }
  }
}

export function createScenarioGitRoots(prefix: string): {
  cloneRoot: string;
  worktreeRoot: string;
  cleanup: () => void;
} {
  const cloneRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-clone-`));
  const worktreeRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), `${prefix}-worktree-`),
  );
  return {
    cloneRoot,
    worktreeRoot,
    cleanup: () => {
      fs.rmSync(cloneRoot, { recursive: true, force: true });
      fs.rmSync(worktreeRoot, { recursive: true, force: true });
    },
  };
}
