import "server-only";

import { createRouterClient, ORPCError } from "@orpc/server";

import { auth, getSession } from "../auth";
import { db } from "../db";
import { fetchUserRole } from "./context";
import { router } from "./router";

/**
 * Server Action から oRPC を in-process で呼ぶための client。
 *
 * `orpcServer` (read-only / SYSTEM actor) との違いは、actorId を cookie session から
 * 解決すること。これにより events テーブルに実ユーザーの id が記録され、監査トレイルが
 * 意味を持つ。Server Action は client から直接 POST されるため、ここでも session を
 * 必須にし、未ログインなら明示的に throw する。
 */
export const orpcAction = createRouterClient(router, {
  context: async () => {
    const session = await getSession();
    if (!session) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "ログインが必要です。",
      });
    }
    const actorId = session.user.id;
    const role = await fetchUserRole(db, actorId);
    return {
      db,
      actorId,
      role,
      auth,
      request: null,
    };
  },
});
