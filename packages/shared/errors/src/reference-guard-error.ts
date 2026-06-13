import type { CustomError, CustomErrorParams } from "./custom-error";

/**
 * Reference guard factory が受け取る共通入力。
 *
 * - `id`: ガード対象 aggregate の id（エラーメッセージに含めるため）
 * - `count`: 紐づく未削除参照の件数（UI が件数を提示できるよう `error.data` に転送）
 */
export type ReferenceGuardErrorData = {
  readonly id: string;
  readonly count: number;
};

/**
 * `defineReferenceGuardError(...)` で生成される reference guard 用 error factory の型。
 * `BaseRepository.referenceGuards[].errorFactory` の契約と一致する。
 */
export type ReferenceGuardErrorFactory = (
  data: ReferenceGuardErrorData,
) => CustomError;

type DomainErrorClassWithName = (new (
  params: CustomErrorParams,
) => CustomError) & {
  readonly packageName: string;
};

/**
 * Soft delete 拒否系の整合性エラー factory を 1 行で生成するヘルパー。
 *
 * 「`{ id, count }` を受けて CONFLICT を返し、`error.data.<key>: count` を載せる」
 * 同型 factory を集約する。
 *
 * @example
 *   class _ParentBase extends defineDomainError("Parent", "parent-feature") {}
 *   export class ParentFeatureError extends _ParentBase {
 *     static hasChildren = defineReferenceGuardError({
 *       errorClass: ParentFeatureError,
 *       message: ({ id, count }) =>
 *         `紐づく子が ${count} 件あるため Parent を削除できません (id: ${id})`,
 *       dataKey: "childCount",
 *     });
 *   }
 */
export function defineReferenceGuardError(opts: {
  errorClass: DomainErrorClassWithName;
  message: (data: ReferenceGuardErrorData) => string;
  dataKey: string;
}): ReferenceGuardErrorFactory {
  return (data) =>
    new opts.errorClass({
      code: "CONFLICT",
      packageName: opts.errorClass.packageName,
      message: opts.message(data),
      data: { [opts.dataKey]: data.count },
    });
}
