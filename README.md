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

### 開発用 Docker

- **Postgres 16** — `localhost:5432`（永続ボリューム `postgres_data`）
- **ElasticMQ** — SQS 互換 API `localhost:9324`、キュー `dev-queue`

apps / packages は Phase 1 以降で追加する。web・worker・relay はホスト上で `pnpm dev` 起動する想定（[docs/AGREEMENTS.md](./docs/AGREEMENTS.md) 参照）。
