import "server-only";

/**
 * ホーム画面。Phase 2 ではサンプルドメイン UI を除外し、最小の管理シェルのみ提供する。
 */
export default function HomePage() {
  return (
    <div className="px-8 py-6">
      <h1 className="text-xl font-semibold">ホーム</h1>
      <p className="mt-2 text-sm text-zinc-600">
        new-cursor 管理画面（Phase 2 — ローカル dev スキャフォールド）
      </p>
    </div>
  );
}
