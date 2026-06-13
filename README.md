# new-cursor

## コンセプト

- Cursor の先を行く業務自動化基盤
- 起票から完了まで、自動化できる作業をエージェントに委ねる
- あらゆる業務アプリをつなぎ、仕事の流れを途切れさせない
- 使い続けるほど、自分自身を改善し続ける
- 新しい AI 駆動開発体験を届ける

## セットアップ

### 前提

- Node.js 22.18（`.nvmrc` 参照）
- pnpm 9
- Docker Compose

### 手順

1. Node を有効化: `nvm use`（または Node 22.18 をインストール）
2. 依存関係をインストール: `pnpm install`
3. 環境変数を用意: `cp .env.example .env`
4. ローカル DB と ElasticMQ を起動: `docker compose up -d`
5. Lint を実行: `pnpm lint`
6. DB スキーマを反映: `pnpm db:push`
7. 環境変数をコピー: `pnpm setup:env`（または `cp .env.example .env`）
8. 全 apps を起動: `pnpm dev`

### ローカル検証（Phase 2）

1. `docker compose up -d` — Postgres + ElasticMQ
2. `pnpm db:push` — auth / events スキーマ
3. `pnpm dev` — web (3000) + worker (3001) + relay (3002) を並列起動
4. ヘルスチェック:
   - web: oRPC `health` / `db.ping`（`/api/rpc`、smoke test 参照）
   - worker: `curl http://localhost:3001/health`
   - relay: `curl http://localhost:3002/health`
5. （任意）初回 admin: `pnpm seed:admin`

### ローカル検証（Phase 3 — outbox / relay / inbox）

1. `docker compose up -d` — Postgres + ElasticMQ
2. `pnpm db:push` — outbox / inbox / tasks スキーマを含む
3. `pnpm dev` — web (3000) + worker (3001) + relay (3002)
4. （任意）`pnpm seed:admin` でログイン可能な admin を作成
5. oRPC `tasks.create` でタスク起票（events + outbox が同一 txn で insert）
6. relay ログに `relay published` が出る → ElasticMQ `dev-queue` へ publish
7. worker ログに `worker ack processed=` が出る → inbox 記録 + SQS delete

- **Postgres 16** — `localhost:5432`（永続ボリューム `postgres_data`）
- **ElasticMQ** — SQS 互換 API `localhost:9324`、キュー `dev-queue`

apps / packages は Phase 2 で web・worker・relay を追加済み。ホスト上で `pnpm dev` 起動する想定（[docs/AGREEMENTS.md](./docs/AGREEMENTS.md) 参照）。
