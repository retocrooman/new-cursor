import { CustomError } from "./custom-error";

/**
 * 各 feature でほぼ同形に書かれる定型エラー
 * (`notFound` / `versionMismatch` / `alreadyDeleted` / `notDeleted` /
 * `insertFailed` / `invalidTransition`) を一括で持つサブクラスを生成する。
 *
 * @example
 *   export const ItemFeatureError = defineDomainError("Item", "item-feature");
 *
 *   // ドメイン固有のエラーが必要なら extends する
 *   class _ItemBase extends defineDomainError("Item", "item-feature") {}
 *   export class ItemFeatureError extends _ItemBase {
 *     static custom(...) { return new ItemFeatureError({ ... }); }
 *   }
 *
 * 戻り値は具象クラス。同じ label を 2 回呼ぶと別クラスができるので、
 * `instanceof` の判定対象として扱う場合は必ず 1 つにまとめてエクスポートする。
 */
export function defineDomainError<TLabel extends string>(
  label: TLabel,
  packageName: string,
) {
  // `new this(...)` を使って、サブクラスで extends した時に **サブクラス** の
  // インスタンスを返す。これにより共通 factory が拡張後のクラスの instance を
  // 返し、`instanceof` ベースの分岐が一貫して機能する。
  class DomainError extends CustomError {
    static override readonly packageName = packageName;

    static notFound(this: typeof DomainError, id: string) {
      return new this({
        code: "NOT_FOUND",
        packageName,
        message: `${label} が見つかりません (id: ${id})`,
      });
    }

    static versionMismatch(
      this: typeof DomainError,
      id: string,
      expected: number,
      actual: number,
    ) {
      return new this({
        code: "CONFLICT",
        packageName,
        message: `${label} が他の操作で更新されています (id: ${id}, expected: ${expected}, actual: ${actual})`,
      });
    }

    static alreadyDeleted(this: typeof DomainError, id: string) {
      return new this({
        code: "PRECONDITION_FAILED",
        packageName,
        message: `${label} はすでに削除済みです (id: ${id})`,
      });
    }

    static notDeleted(this: typeof DomainError, id: string) {
      return new this({
        code: "PRECONDITION_FAILED",
        packageName,
        message: `削除されていない ${label} は復元できません (id: ${id})`,
      });
    }

    static insertFailed(this: typeof DomainError) {
      return new this({
        code: "INTERNAL_SERVER_ERROR",
        packageName,
        message: `${label} の作成に失敗しました`,
      });
    }

    static invalidTransition(
      this: typeof DomainError,
      id: string,
      from: string,
      to: string,
      allowed: readonly string[],
    ) {
      return new this({
        code: "PRECONDITION_FAILED",
        packageName,
        message: `${label} を ${from} から ${to} に遷移できません (id: ${id}, allowed from: ${allowed.join(" / ")})`,
      });
    }
  }
  return DomainError;
}

/**
 * `defineDomainError(...)` の戻り値型。`extends` する側で参照するためのエイリアス。
 */
export type DomainErrorClass = ReturnType<typeof defineDomainError>;
