import { z } from "zod";

/**
 * 運用上の事由 (reason) をオプショナルに乗せるドメインイベント payload の共通 shape。
 *
 * delete / restore / archive など「なぜこのイベントが発生したか」を任意のフリー
 * テキストで記録する場面で使う。規約として、reason を記録する event はこの schema を
 * 経由する（個別に `z.object({ reason: z.string().optional() })` を再定義しない）。
 */
export const reasonPayloadSchema = z.object({
  reason: z.string().optional(),
});

export type ReasonPayload = z.infer<typeof reasonPayloadSchema>;
