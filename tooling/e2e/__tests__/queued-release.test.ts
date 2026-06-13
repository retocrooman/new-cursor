import { createAgent } from "@new-cursor/agents-feature";
import {
  StubCursorSdkAdapter,
  setCursorSdkAdapterForTests,
} from "@new-cursor/cursor-sdk-port";
import { createClient, eq, getRawClient, outbox, tasks } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";
import { createBareRepoFixture } from "@new-cursor/git-ops/bare-repo-fixture";
import { registerRepository } from "@new-cursor/repositories-feature";
import { upsertSubscription } from "@new-cursor/subscriptions-feature";
import {
  createTaskCreatedEvent,
  insertTask,
  taskCreatedPayload,
} from "@new-cursor/tasks-feature";
import { setGitOpsRootsForTests } from "@new-cursor/worker-dispatch-feature";
import { afterEach, describe, expect, it } from "vitest";

import { createScenarioGitRoots, relayAndDispatchAll } from "../src/helpers";
import { withFreshScenario } from "../src/with-fresh-scenario";

describe("E2E-9A — queued task release after run_completed", () => {
  const cleanups: Array<() => void> = [];
  const stub = new StubCursorSdkAdapter();

  afterEach(() => {
    setGitOpsRootsForTests(undefined);
    setCursorSdkAdapterForTests(undefined);
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  it("releases the second task from queued to worktree_requested after the first completes", async () => {
    setCursorSdkAdapterForTests(stub);
    const fixture = createBareRepoFixture();
    cleanups.push(fixture.cleanup);
    const gitRoots = createScenarioGitRoots("e2e-9a");
    cleanups.push(gitRoots.cleanup);
    setGitOpsRootsForTests({
      cloneRoot: gitRoots.cloneRoot,
      worktreeRoot: gitRoots.worktreeRoot,
      defaultBaseBranch: fixture.baseBranch,
    });

    await withFreshScenario(async (env) => {
      const db = createClient(env.databaseUrl, { max: 4 });

      try {
        let firstTaskId = "";
        let secondTaskId = "";
        await db.transaction(async (tx) => {
          const agent = await createAgent(tx, { name: "e2e-9a-worker" });
          await upsertSubscription(tx, {
            agentId: agent.id,
            eventTypes: [
              "task_created",
              "task_stage_changed",
              "task_worktree_ready",
              "run_completed",
            ],
          });
          const repository = await registerRepository(tx, {
            name: "release-fixture",
            remoteUrl: fixture.remoteUrl,
          });

          for (const [title, slot] of [
            ["first release task", "first"],
            ["second release task", "second"],
          ] as const) {
            const task = await insertTask(tx, {
              title,
              repositoryId: repository.id,
              branchName: "feat/shared-release",
            });
            if (slot === "first") {
              firstTaskId = task.id;
            } else {
              secondTaskId = task.id;
            }
            const appendable = createTaskCreatedEvent({
              aggregateId: task.id,
              actorId: SYSTEM_ACTOR_ID,
              version: task.version,
              occurredAt: task.createdAt,
              payload: taskCreatedPayload({
                id: task.id,
                title: task.title,
                branchName: task.branchName,
                repositoryId: task.repositoryId,
                parentTaskId: task.parentTaskId,
              }),
            });
            const appended = await appendEvent(tx, appendable);
            await writeOutbox(tx, { ...appendable, eventId: appended.eventId });
          }
        });

        await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 12 });

        const firstAfterQueue = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, firstTaskId));
        const secondAfterQueue = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, secondTaskId));
        expect(firstAfterQueue[0]?.stage).toBe("completed");
        expect(secondAfterQueue[0]?.stage).not.toBe("queued");

        const releaseOutbox = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventType, "task_stage_changed"));
        expect(
          releaseOutbox.some((row) => {
            const payload = row.payload as {
              taskId?: string;
              fromStage?: string;
              toStage?: string;
            };
            return (
              payload.taskId === secondTaskId &&
              payload.fromStage === "queued" &&
              payload.toStage === "worktree_requested"
            );
          }),
        ).toBe(true);

        const secondStage = secondAfterQueue[0]?.stage;
        if (secondStage === "worktree_requested") {
          await relayAndDispatchAll({ db, sqs: env.sqs, maxRounds: 8 });

          const secondAfterWorktree = await db
            .select()
            .from(tasks)
            .where(eq(tasks.id, secondTaskId));
          expect(secondAfterWorktree[0]?.stage).toBe("worktree_ready");
          expect(secondAfterWorktree[0]?.worktreePath).toBeTruthy();
          return;
        }

        expect(secondAfterQueue[0]?.worktreePath).toBeTruthy();
        expect(["worktree_ready", "implementing", "completed"]).toContain(
          secondStage,
        );
      } finally {
        await getRawClient(db).end();
      }
    });
  });
});
