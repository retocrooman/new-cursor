import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  // マイグレーション SQL の生成先は supabase/migrations（手で書かない・手でコミットしない）。
  // ローカル / テストは `db:push`（drizzle-kit push）で同期し、生成は CI が担う。
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // CI では各 statement の verbose ログを抑制して接続文字列のヒントを残さない。
  verbose: process.env.CI !== "true",
  strict: true,
});
