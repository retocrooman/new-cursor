import { z } from "zod";

const createTaskActionSchema = z.object({
  action: z.literal("create_task"),
  title: z.string().min(1),
  branchName: z.string().nullable().optional(),
  repositoryId: z.string().uuid().nullable().optional(),
});

export type CreateTaskAction = z.infer<typeof createTaskActionSchema>;

const actionPattern = /\{"action"\s*:\s*"create_task"[^}]*\}/;

export function parseCreateTaskAction(reply: string): CreateTaskAction | null {
  const match = reply.match(actionPattern);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    const result = createTaskActionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function stripCreateTaskAction(reply: string): string {
  return reply.replace(actionPattern, "").trim();
}
