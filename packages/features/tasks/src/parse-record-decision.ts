import { z } from "zod";

const recordDecisionActionSchema = z.object({
  action: z.literal("record_decision"),
  taskId: z.string().uuid().optional(),
  summary: z.string().min(1),
  context: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  userResponse: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export type RecordDecisionAction = z.infer<typeof recordDecisionActionSchema>;

const actionPattern = /\{"action"\s*:\s*"record_decision"[\s\S]*?\}/g;

export function parseRecordDecisionActions(
  text: string,
): RecordDecisionAction[] {
  const matches = text.match(actionPattern);
  if (!matches) return [];

  const actions: RecordDecisionAction[] = [];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match) as unknown;
      const result = recordDecisionActionSchema.safeParse(parsed);
      if (result.success) {
        actions.push(result.data);
      }
    } catch {
      // skip invalid JSON blocks
    }
  }
  return actions;
}

export function stripRecordDecisionActions(text: string): string {
  return text.replace(actionPattern, "").trim();
}
