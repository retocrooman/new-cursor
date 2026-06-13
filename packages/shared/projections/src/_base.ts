import { z } from "zod";

/**
 * 全 projection が共有する監査用 zod フィールド。
 * 各 projection の `z.object({ ...auditFields, ... })` のように spread して使う。
 */
export const auditFields = {
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  version: z.number().int(),
} as const;

export type AuditFields = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
};

/**
 * 監査カラムを持つ Drizzle row の最小形。
 */
export type AuditableRow = {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
};

/**
 * Drizzle row から projection の監査フィールド部分だけを抽出する。
 * `toXxxProjection` で `...toAuditFields(row)` のように spread する。
 */
export function toAuditFields(row: AuditableRow): AuditFields {
  return {
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    version: row.version,
  };
}
