import { type DbOrTx, desc, eq, taskDecisions, tasks } from "@new-cursor/db";
import {
  type TaskDecisionProjection,
  type TaskDecisionRow,
  toTaskDecisionProjection,
} from "../model/decision-projection";
import { TaskFeatureError } from "./tasks";

export async function listDecisionsByTask(
  tx: DbOrTx,
  taskId: string,
): Promise<{ rows: TaskDecisionProjection[]; total: number }> {
  const rows = await tx
    .select()
    .from(taskDecisions)
    .where(eq(taskDecisions.taskId, taskId))
    .orderBy(desc(taskDecisions.createdAt));

  const projections = rows.map((row) =>
    toTaskDecisionProjection(row as TaskDecisionRow),
  );

  return {
    rows: projections,
    total: projections.length,
  };
}

export async function createTaskDecision(
  tx: DbOrTx,
  input: {
    taskId: string;
    summary: string;
    context?: string | null;
    userResponse?: string | null;
    agentId?: string | null;
  },
): Promise<TaskDecisionProjection> {
  const taskRows = await tx
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, input.taskId));

  if (taskRows.length === 0) {
    throw TaskFeatureError.notFound(input.taskId);
  }

  const [row] = await tx
    .insert(taskDecisions)
    .values({
      taskId: input.taskId,
      summary: input.summary,
      context: input.context ?? null,
      userResponse: input.userResponse ?? null,
      agentId: input.agentId ?? null,
    })
    .returning();

  if (!row) {
    throw TaskFeatureError.insertFailed();
  }

  return toTaskDecisionProjection(row as TaskDecisionRow);
}
