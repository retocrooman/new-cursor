import { z } from "zod";

/**
 * list 系 contract で共有する sort の zod schema。
 *
 * 各ドメインで毎回 `sort: z.object(...)` を書くと差分が出やすいため factory 化する。
 *
 * 利用例:
 * ```ts
 * const listInput = z.object({
 *   sort: sortInputFor(z.enum(["createdAt", "updatedAt"])).optional(),
 * });
 * ```
 */
export const sortDirectionEnum = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof sortDirectionEnum>;

/**
 * sort 入力の factory。`field` はドメインごとに許容するカラム名 enum を渡す。
 * direction の default は "desc"（業務的に「最新順」が多いため）。
 */
export function sortInputFor<T extends z.ZodEnum<[string, ...string[]]>>(
  field: T,
) {
  return z.object({
    field,
    direction: sortDirectionEnum.default("desc"),
  });
}
