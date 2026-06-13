import { createAuthClient } from "better-auth/react";

/**
 * Client Component 用の better-auth クライアント。
 * 同一オリジンで `/api/auth/*` を叩くため baseURL は省略可。
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
