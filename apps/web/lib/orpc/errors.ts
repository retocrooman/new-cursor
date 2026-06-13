import { CustomError } from "@new-cursor/errors";
import { ORPCError } from "@orpc/server";

// features 側で投げられた CustomError を oRPC が認識できる ORPCError に変換する。
// `CustomError.data`（件数 / 候補値などの付帯情報）が乗っていれば `ORPCError.data` に
// そのまま転送し、UI が文言生成で利用できるようにする。
export function rethrowAsORPC(error: unknown): never {
  if (error instanceof CustomError) {
    throw new ORPCError(error.code, {
      message: error.message,
      ...(error.data ? { data: error.data } : {}),
    });
  }
  throw error;
}

// 非同期処理を実行し、CustomError が投げられた場合は ORPCError へ変換して再 throw する。
export async function mapErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    rethrowAsORPC(error);
  }
}
