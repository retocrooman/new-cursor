import { createClient, type Database, getRawClient } from "@new-cursor/db";

export async function closeScriptDbClient(db: Database): Promise<void> {
  await getRawClient(db).end();
}

export async function withScriptDatabase<T>(input: {
  connectionString: string;
  run: (db: Database) => Promise<T>;
}): Promise<T> {
  const db = createClient(input.connectionString);
  try {
    return await input.run(db);
  } finally {
    await closeScriptDbClient(db);
  }
}
