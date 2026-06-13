import path from "node:path";

/** apps/web から monorepo ルートを解決する。 */
export function resolveRepoRoot(): string {
  return path.resolve(process.cwd(), "../..");
}
