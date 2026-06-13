#!/usr/bin/env tsx
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ローカル開発用: ルートの `.env.example` を `.env` にコピーする便利スクリプト。
 *
 * - パスはこのファイル位置（tooling/scripts/src）からワークスペースルートを解決するため、
 *   どの cwd から実行しても動く。
 * - **SAFETY**: 既存の `.env` は既定で上書きしない。存在する場合はメッセージを出して
 *   exit 0（冪等・安全な no-op）。`--force` で明示的に上書きできる。
 * - `.env` は gitignore 済み（コミットされない）。
 */

// tooling/scripts/src/setup-env.ts → 3 階層上がワークスペースルート。
const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const SOURCE = join(REPO_ROOT, ".env.example");
const DEST = join(REPO_ROOT, ".env");

function rel(p: string): string {
  return relative(REPO_ROOT, p) || p;
}

function main(): void {
  const force = process.argv.slice(2).includes("--force");

  if (!existsSync(SOURCE)) {
    console.error(`❌ ${rel(SOURCE)} が見つかりません。`);
    process.exit(1);
  }

  if (existsSync(DEST) && !force) {
    console.log(
      `ℹ️  ${rel(DEST)} は既に存在するため何もしませんでした（上書きするには --force）。`,
    );
    process.exit(0);
  }

  copyFileSync(SOURCE, DEST);
  console.log(
    `✅ ${rel(SOURCE)} を ${rel(DEST)} に${force ? "上書き" : "コピー"}しました。` +
      ` 必要に応じて値を編集してください（BETTER_AUTH_SECRET など）。`,
  );
}

if (import.meta.filename === process.argv[1]) {
  main();
}
