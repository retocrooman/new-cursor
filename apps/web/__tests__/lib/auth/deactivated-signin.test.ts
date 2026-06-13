import { type Auth, createAuth } from "@new-cursor/auth";
import { type Database, eq, type Transaction, users } from "@new-cursor/db";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

/**
 * 無効化（soft delete）されたユーザーが sign-in できないことの integration test。
 *
 * tx-bound auth（`createAuth({ db: tx })`）で signUp → signIn を実際に流し、
 * `databaseHooks.session.create.before` の FORBIDDEN ブロックを検証する。
 * `withRollbackTx` で各ケースを巻き戻す。
 */
const SECRET = "test-secret-test-secret-test-secret-test-secret";
const PASSWORD = "deactivate-signin-1234";

function makeAuth(tx: Transaction): Auth {
  return createAuth({
    db: tx as unknown as Database,
    secret: SECRET,
    baseURL: "http://localhost",
  });
}

async function signUp(auth: Auth, email: string): Promise<string> {
  const result = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name: "Sign-in Target" },
  });
  const id = result?.user.id;
  if (!id) throw new Error("failed to sign up test user");
  return id;
}

function signIn(auth: Auth, email: string) {
  return auth.api.signInEmail({ body: { email, password: PASSWORD } });
}

describe("deactivated users cannot sign in", () => {
  it("allows sign-in while active, blocks it after deactivation, restores after reactivation", async () => {
    await withRollbackTx(async (tx) => {
      const auth = makeAuth(tx);
      const email = "signin-lifecycle@example.com";
      const userId = await signUp(auth, email);

      // active: sign-in succeeds
      const first = await signIn(auth, email);
      expect(first).toBeTruthy();

      // deactivate (soft delete) + purge sessions like the handler does
      await tx
        .update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId));

      // deactivated: sign-in is rejected with FORBIDDEN / USER_DEACTIVATED
      const error = await signIn(auth, email).catch((err: unknown) => err);
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({ status: "FORBIDDEN" });
      const body = (error as { body?: { code?: string } }).body;
      expect(body?.code).toBe("USER_DEACTIVATED");

      // reactivate: sign-in works again
      await tx
        .update(users)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(users.id, userId));

      const afterReactivate = await signIn(auth, email);
      expect(afterReactivate).toBeTruthy();
    });
  });
});
