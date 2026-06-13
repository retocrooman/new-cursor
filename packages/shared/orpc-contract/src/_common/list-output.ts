import { z } from "zod";

export function listOutputFor<T extends z.ZodTypeAny>(rowSchema: T) {
  return z.object({
    rows: z.array(rowSchema),
    total: z.number().int(),
  });
}
