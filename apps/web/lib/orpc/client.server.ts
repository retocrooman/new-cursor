import "server-only";

import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { createRouterClient } from "@orpc/server";

import { auth } from "../auth";
import { db } from "../db";
import { readRouter } from "./router";

// Server Components から oRPC を in-process で呼ぶための **read-only** client。
//
// `readRouter` 経由のため `orpcServer.<domain>.<write_op>` は型レベルで存在しない
// （write handler は router に含まれない）。HTTP fetch を経由しないため Next.js の
// キャッシュレイヤと干渉せず、型は contract の read 系と完全一致する。
//
// `actorId` は read-only 経路のため SYSTEM 固定で問題ない（events を append しない）。
export const orpcServer = createRouterClient(readRouter, {
  context: () => ({
    db,
    actorId: SYSTEM_ACTOR_ID,
    role: null,
    auth,
    request: null,
  }),
});
