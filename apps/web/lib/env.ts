import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const baseEnv = createEnv({
  server: {
    DATABASE_URL: z.string().url().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    APP_ENV: z
      .enum(["development", "staging", "production", "test"])
      .default("development"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().optional(),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});

export type AuthUrlSources = {
  betterAuthUrl?: string;
  extraTrustedOrigins?: readonly string[];
};

export function parseExtraTrustedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  const origins: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const parsed = z.string().url().safeParse(trimmed);
    if (!parsed.success) {
      throw new Error(
        `Invalid BETTER_AUTH_TRUSTED_ORIGINS entry (must be a full URL): ${trimmed}`,
      );
    }
    origins.push(parsed.data);
  }
  return origins;
}

export function pickBetterAuthUrl(sources: AuthUrlSources): string | undefined {
  return sources.betterAuthUrl;
}

export function pickTrustedOrigins(sources: AuthUrlSources): string[] {
  const candidates: string[] = [];
  if (sources.betterAuthUrl) candidates.push(sources.betterAuthUrl);
  if (sources.extraTrustedOrigins) {
    for (const origin of sources.extraTrustedOrigins) {
      if (origin) candidates.push(origin);
    }
  }
  return [...new Set(candidates)];
}

function authUrlSources(): AuthUrlSources {
  return {
    betterAuthUrl: baseEnv.BETTER_AUTH_URL,
    extraTrustedOrigins: parseExtraTrustedOrigins(
      baseEnv.BETTER_AUTH_TRUSTED_ORIGINS,
    ),
  };
}

function resolveDatabaseUrl(): string | undefined {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return baseEnv.DATABASE_URL;
  }
  if (baseEnv.DATABASE_URL) return baseEnv.DATABASE_URL;
  throw new Error("DATABASE_URL must be set in environment variables");
}

function resolveBetterAuthUrl(): string | undefined {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return baseEnv.BETTER_AUTH_URL;
  }
  const resolved = pickBetterAuthUrl(authUrlSources());
  if (resolved) return resolved;
  throw new Error("BETTER_AUTH_URL must be set in environment variables");
}

export function resolveTrustedOrigins(): string[] {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return pickTrustedOrigins(authUrlSources());
  }
  const origins = pickTrustedOrigins(authUrlSources());
  if (origins.length === 0) {
    throw new Error("BETTER_AUTH_URL must be set in environment variables");
  }
  return origins;
}

export const env = new Proxy(baseEnv, {
  get(target, prop, receiver) {
    if (prop === "DATABASE_URL") return resolveDatabaseUrl();
    if (prop === "BETTER_AUTH_URL") return resolveBetterAuthUrl();
    return Reflect.get(target, prop, receiver);
  },
}) as Omit<typeof baseEnv, "DATABASE_URL" | "BETTER_AUTH_URL"> & {
  DATABASE_URL: string | undefined;
  BETTER_AUTH_URL: string | undefined;
};
