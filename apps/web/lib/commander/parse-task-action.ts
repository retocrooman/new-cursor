import { z } from "zod";

const createTaskActionSchema = z.object({
  action: z.literal("create_task"),
  title: z.string().min(1),
  branchName: z.string().nullable().optional(),
  repositoryId: z.string().uuid().nullable().optional(),
  background: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  verificationItems: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional()
    .transform(normalizeVerificationItems),
});

export type CreateTaskAction = z.infer<typeof createTaskActionSchema>;

const actionPattern = /\{"action"\s*:\s*"create_task"[\s\S]*?\}/;

function normalizeVerificationItems(
  value: string | string[] | null | undefined,
): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const items = value.map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items.join("\n") : null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
