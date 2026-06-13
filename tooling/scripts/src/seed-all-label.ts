#!/usr/bin/env tsx
import { createClient, eq, labels } from "@new-cursor/db";
import { ALL_LABEL_NAME } from "@new-cursor/rules-feature";
import { z } from "zod";

import { closeScriptDbClient } from "./lib/close-db-client";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
});

export async function seedAllLabel(
  db: ReturnType<typeof createClient>,
): Promise<{ created: boolean; labelId: string }> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: labels.id })
      .from(labels)
      .where(eq(labels.name, ALL_LABEL_NAME))
      .limit(1);

    if (existing[0]) {
      return { created: false, labelId: existing[0].id };
    }

    const now = new Date();
    const [row] = await tx
      .insert(labels)
      .values({
        name: ALL_LABEL_NAME,
        createdAt: now,
        updatedAt: now,
        version: 1,
      })
      .returning({ id: labels.id });

    if (!row) {
      throw new Error(`Failed to create "${ALL_LABEL_NAME}" label.`);
    }

    return { created: true, labelId: row.id };
  });
}

async function main() {
  const env = envSchema.parse(process.env);
  const db = createClient(env.DATABASE_URL);
  try {
    const result = await seedAllLabel(db);
    if (result.created) {
      console.log(`Created "${ALL_LABEL_NAME}" label (id: ${result.labelId})`);
      return;
    }
    console.log(
      `"${ALL_LABEL_NAME}" label already exists: skipped (id: ${result.labelId})`,
    );
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
