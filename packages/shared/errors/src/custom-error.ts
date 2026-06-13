/**
 * CustomError で使用可能なエラーコード型。oRPC 互換のエラーコードを定義する。
 */
export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TIMEOUT"
  | "PRECONDITION_FAILED"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR"
  | "CUSTOM";

/**
 * CustomError から ORPCError.data に転送する追加情報。
 * UI が件数 / 候補値などをエラー時に提示したい場合に使う。
 */
export type CustomErrorData = Record<string, unknown>;

export type CustomErrorParams =
  | {
      code: "CUSTOM";
      packageName: string;
      customCode: string;
      message: string;
      data?: CustomErrorData;
    }
  | {
      code: Exclude<ErrorCode, "CUSTOM">;
      packageName: string;
      customCode?: never;
      message: string;
      data?: CustomErrorData;
    };

/**
 * CustomError 抽象クラス。
 *
 * ドメイン層でのエラーハンドリングを統一するための基盤クラス。通常は各 feature の
 * `error.ts` で `defineDomainError(label, packageName)` を使い、`notFound` /
 * `versionMismatch` などの定型 factory を備えたサブクラスを生成する。
 * CustomError を直接 extends するのは `defineDomainError` でカバーできない
 * 特殊な factory が必要な場合のみ。
 */
export abstract class CustomError extends Error {
  static readonly packageName: string;

  public readonly code: ErrorCode;
  public readonly packageName: string;
  public readonly customCode?: string;
  public readonly data?: CustomErrorData;

  public constructor(params: CustomErrorParams) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code;
    this.packageName = params.packageName;
    this.customCode = params.customCode;
    this.data = params.data;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
