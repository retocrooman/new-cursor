import { contract } from "@new-cursor/orpc-contract";
import { implement, ORPCError } from "@orpc/server";

import type { OrpcContext } from "./context";

/** health / db.ping など認証不要の operational endpoint 用。 */
export const osPublic = implement(contract).$context<OrpcContext>();

/**
 * oRPC handler のビルダー。contract と context 型を一度だけ束ねる。
 * 全 endpoint（health / db.ping 除く）で AuthN を強制する。
 */
export const os = implement(contract)
  .$context<OrpcContext>()
  .use(async ({ context, next }) => {
    if (context.actorId === null) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "ログインが必要です。",
      });
    }
    return next({
      context: {
        actorId: context.actorId,
      },
    });
  });
