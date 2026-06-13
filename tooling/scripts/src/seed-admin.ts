#!/usr/bin/env tsx
import { createAuth } from "@new-cursor/auth";
import {
  createClient,
  type Database,
  type DbOrTx,
  eq,
  type UserRole,
  users,
} from "@new-cursor/db";
import { USER_ROLES } from "@new-cursor/db/schema";
import { z } from "zod";

import { closeScriptDbClient } from "./lib/close-db-client";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
});

const seedAdminArgsSchema = z.object({
  email: z.string().email("email must be a valid address"),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1).optional(),
  role: z.enum(USER_ROLES).optional(),
});

export type SeedAdminInput = {
  db: Database;
  secret: string;
  baseURL: string;
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
};

export type SeedAdminResult =
  | { created: false; userId: string; role: string | null }
  | { created: true; userId: string; role: UserRole };

async function findByEmail(db: DbOrTx, email: string) {
  const rows = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

async function setRole(
  db: DbOrTx,
  userId: string,
  role: UserRole,
): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function seedAdmin(
  input: SeedAdminInput,
): Promise<SeedAdminResult> {
  const {
    email,
    password,
    name,
    role = "admin",
  } = seedAdminArgsSchema.parse({
    email: input.email,
    password: input.password,
    name: input.name,
    role: input.role,
  });
  const displayName = name ?? (role === "admin" ? "Admin" : "Staff");

  return input.db.transaction(async (tx) => {
    const existing = await findByEmail(tx, email);
    if (existing) {
      return { created: false, userId: existing.id, role: existing.role };
    }

    const txAuth = createAuth({
      db: tx,
      secret: input.secret,
      baseURL: input.baseURL,
    });
    const result = await txAuth.api.signUpEmail({
      body: { email, password, name: displayName },
    });
    const createdUser = result?.user;
    if (!createdUser?.id) {
      throw new Error(`Failed to create ${role} user via better-auth.`);
    }

    await setRole(tx, createdUser.id, role);

    return { created: true, userId: createdUser.id, role };
  });
}

function readHiddenLineFromTty(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let buffer = "";
    const cleanup = () => {
      process.stdin.setRawMode?.(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
    };

    const onData = (chunk: string) => {
      for (const char of chunk) {
        const code = char.charCodeAt(0);
        if (code === 0x03) {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Interrupted by user"));
          return;
        }
        if (code === 0x0a || code === 0x0d) {
          cleanup();
          process.stdout.write("\n");
          resolve(buffer);
          return;
        }
        if (code === 0x7f || code === 0x08) {
          buffer = buffer.slice(0, -1);
          continue;
        }
        if (code < 0x20) continue;
        buffer += char;
      }
    };

    process.stdin.on("data", onData);
  });
}

async function readPassword(role: UserRole): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  if (!process.stdin.isTTY) {
    throw new Error(
      "ADMIN_PASSWORD 環境変数が未設定で、stdin が TTY でないため対話プロンプトを開けません。",
    );
  }

  const label = role === "admin" ? "Admin" : "Staff";
  return readHiddenLineFromTty(`${label} password (hidden): `);
}

function parseRoleArg(raw: string | undefined): UserRole {
  if (raw === undefined) return "admin";
  if (raw === "admin" || raw === "staff") return raw;
  throw new Error(
    `Invalid role argument: "${raw}". Allowed: ${USER_ROLES.join(" / ")}`,
  );
}

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value && value.length > 0) return value;
  }
  return undefined;
}

async function main() {
  const env = envSchema.parse(process.env);
  const args = process.argv.slice(2);
  const email = firstNonEmpty(args[0], process.env.SEED_ADMIN_EMAIL);
  const rawName = firstNonEmpty(args[1], process.env.SEED_ADMIN_NAME);
  const role = parseRoleArg(
    firstNonEmpty(args[2], process.env.SEED_ADMIN_ROLE),
  );
  const name = rawName ?? (role === "admin" ? "Admin" : "Staff");
  if (!email) {
    console.error("Usage: pnpm seed:admin [email] [name] [role]");
    process.exit(1);
  }

  const password = await readPassword(role);
  const db = createClient(env.DATABASE_URL);
  try {
    const result = await seedAdmin({
      db,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      email,
      password,
      name,
      role,
    });
    if (!result.created) {
      console.log(
        `${role} user already exists: ${email}, skipped (id: ${result.userId}, role: ${result.role ?? "null"})`,
      );
      return;
    }
    console.log(`Created ${role} user: ${email} (id: ${result.userId})`);
  } finally {
    await closeScriptDbClient(db);
  }
}

if (import.meta.filename === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
