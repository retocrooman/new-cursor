import {
  agents,
  type DbOrTx,
  eq,
  type RunStatus,
  runs,
  tasks,
} from "@new-cursor/db";
import { defineDomainError } from "@new-cursor/errors";
import { BaseRepository } from "@new-cursor/repository-kit";

import {
  type RunProjection,
  type RunRow,
  toRunProjection,
} from "../model/projection";

export const RunFeatureError = defineDomainError("Run", "runs-feature");

class RunsRepository extends BaseRepository<
  RunRow,
  RunProjection,
  "taskId" | "agentId"
> {
  protected override readonly table = runs;
  protected override readonly errors = RunFeatureError;
  protected override readonly defaultSort = {
    column: runs.createdAt,
    direction: "desc" as const,
  };
  protected override readonly sortableFields = {
    createdAt: runs.createdAt,
    updatedAt: runs.updatedAt,
  };
  protected override readonly filterableFields = ["taskId", "agentId"] as const;

  protected toProjection(row: RunRow): RunProjection {
    return toRunProjection(row);
  }
}

const runsRepository = new RunsRepository();

async function assertTaskExists(tx: DbOrTx, taskId: string): Promise<void> {
  const rows = await tx
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, taskId));
  if (rows.length === 0) {
    throw RunFeatureError.notFound(taskId);
  }
}

async function assertAgentExists(tx: DbOrTx, agentId: string): Promise<void> {
  const rows = await tx
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.id, agentId));
  if (rows.length === 0) {
    throw RunFeatureError.notFound(agentId);
  }
}

export async function createRun(
  tx: DbOrTx,
  input: {
    taskId: string;
    agentId: string;
    stage?: string | null;
    summary?: string | null;
  },
): Promise<RunProjection> {
  await assertTaskExists(tx, input.taskId);
  await assertAgentExists(tx, input.agentId);

  const now = new Date();
  const [row] = await tx
    .insert(runs)
    .values({
      taskId: input.taskId,
      agentId: input.agentId,
      status: "running",
      stage: input.stage ?? null,
      summary: input.summary ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
    .returning();

  if (!row) {
    throw RunFeatureError.insertFailed();
  }

  return toRunProjection(row as RunRow);
}

export async function findRunById(
  tx: DbOrTx,
  id: string,
): Promise<RunProjection | null> {
  return runsRepository.findById(tx, id);
}

export async function listRuns(
  tx: DbOrTx,
  opts?: Parameters<typeof runsRepository.list>[1],
) {
  return runsRepository.list(tx, opts);
}

export async function updateRunAfterSdk(
  tx: DbOrTx,
  input: {
    runId: string;
    cursorAgentId: string;
    status: RunStatus;
    summary?: string | null;
    errorMessage?: string | null;
  },
): Promise<RunProjection> {
  const existing = await findRunById(tx, input.runId);
  if (!existing) {
    throw RunFeatureError.notFound(input.runId);
  }

  const now = new Date();
  const [row] = await tx
    .update(runs)
    .set({
      cursorAgentId: input.cursorAgentId,
      status: input.status,
      summary: input.summary ?? existing.summary,
      errorMessage: input.errorMessage ?? null,
      updatedAt: now,
      version: existing.version + 1,
    })
    .where(eq(runs.id, input.runId))
    .returning();

  if (!row) {
    throw RunFeatureError.notFound(input.runId);
  }

  return toRunProjection(row as RunRow);
}
