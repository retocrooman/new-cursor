# Cursor SDK 仕様サマリ

> 公開ベータ。TypeScript（`@cursor/sdk`）と Python（`cursor-sdk`）で同一概念。

## パッケージ

- **TypeScript**: `npm install @cursor/sdk`（Node 必須、sqlite3 + ネイティブバイナリ同梱）
- **Python**: `uv pip install cursor-sdk`（sync デフォルト、`AsyncClient` で async）
- **認証**: `CURSOR_API_KEY`（ユーザー鍵 or サービスアカウント鍵）。Team Admin 鍵は未対応

## コア概念

| 概念 | 説明 |
| --- | --- |
| **Agent** | 会話状態・ワークスペース設定を保持する durable コンテナ。複数 Run を跨いで存続 |
| **Run** | 1 回のプロンプト送信。ストリーム・status・result・cancel を所有 |
| **SDKMessage** | Run 中の正規化ストリームイベント（local/cloud 共通形状） |

## 3 つの呼び出しパターン

### 1. `Agent.prompt(...)` — ワンショット

- create → send → wait → dispose を一括
- GitHub Actions や単発スクリプト向け
- フォローアップ不要ならこれが最短

### 2. `Agent.create(...)` + `agent.send(...)` — マルチターン

- ストリーミング・複数ターン・cancel が必要ならこちら
- `agent.send()` ごとに `Run` が返る。会話コンテキストは Agent が保持
- **必ず `run.wait()`** — ストリーム省略可だが wait はほぼ必須
- TypeScript: `await using agent = await Agent.create(...)`
- Python: `with Agent.create(...) as agent:`

### 3. `Agent.resume(agentId, ...)` — 既存 Agent 再開

- プロセス再起動・別 Worker 引き継ぎ・cron 再開向け
- ID プレフィックスでランタイム自動判定: `bc-` = cloud、それ以外 = local
- **inline `mcpServers` は resume 時に再指定必須**（永続化されない）
- resume 時 `model` 未指定なら `undefined`（再指定推奨）

## Local vs Cloud

| | Local | Cloud |
| --- | --- | --- |
| **実行場所** | 呼び出し元マシン（`local.cwd` の working tree） | Cursor ホスト VM（repo clone） |
| **Agent ID** | `agent-*` | `bc-*` |
| **用途** | dev ループ、CI（checkout 済み）、worktree 作業 | 並列大量実行、呼び出し元切断後も継続、PR 自動作成 |
| **model** | **必須** | TS は省略可（サーバー default）、明示推奨 |
| **MCP** | stdio / HTTP（OAuth は Cursor app ログイン済みのみ） | stdio（VM 内）/ HTTP（backend が auth 処理） |
| **Artifacts** | 空 | `listArtifacts` / `downloadArtifact` 可 |

### 注意

- **`local` / `cloud` を明示指定すること** — 未指定時は local になる（cloud 意図で silent fail しうる）
- Local = エージェントループがローカル。**推論は両方とも Cursor ホストモデル**
- Cloud CI では `skipReviewerRequest: true` で reviewer 通知抑制
- Self-hosted pool も `cloud.env` で指定可能

## MCP 統合

- 渡し方: `Agent.create()` または `agent.send()` の inline `mcpServers`
- トランスポート: **stdio**（command/args/env）または **http/sse**（url/headers/auth）
- **send 時の inline は create 時を完全置換**（マージされない）
- 優先順位: send inline > create inline > project (`.cursor/mcp.json`) > user > team/dashboard
- Local で file-based MCP を使う場合: `local.settingSources: ["project"]` 等を明示
- サービスから使う場合: デフォルト `settingSources: []`（inline のみ）が安全
- Cloud の HTTP `headers`/`auth` は backend が処理し VM には redacted

## エラーハンドリング（2 系統）

### A. 例外 `CursorAgentError`（= `CursorSdkError`）

- **Run が開始されなかった**（auth / config / network）
- `isRetryable` でリトライ可否判断。Python は `retry_after` も
- 代表: `AuthenticationError`, `RateLimitError`, `AgentBusyError`, `IntegrationNotConnectedError`
- exit code 例: **1**（startup 失敗）

### B. `RunResult.status === "error"`

- **Run は実行されたが失敗**
- トランスクリプト・git 状態・ツール出力を調査
- status: `"finished" | "error" | "cancelled"`
- exit code 例: **2**（run 失敗）

```typescript
// パターン
try {
  const run = await agent.send(prompt);
  const result = await run.wait();
  if (result.status === "error") { /* run 失敗 */ }
} catch (err) {
  if (err instanceof CursorAgentError) { /* 起動失敗 */ }
}
```

## ライフサイクル / Disposal

- Agent は executor・HTTP client・checkpoint store のハンドルを保持
- **dispose 省略 = 子プロセス・DB 接続リーク**
- TypeScript: `await using` → `[Symbol.asyncDispose]()` / `close()`
- Python sync: `with` → `close()` / `close_default_client()`
- Python async: `AsyncClient.launch_bridge` + `async with`（イベントループごとに 1 client）
- `Agent.prompt()` は自動 dispose
- `agent.reload()` — dispose せず hooks/MCP/subagents を再読込

### Local checkpoint store

- デフォルト: ホーム配下 SQLite
- プロセス再起動後も `Agent.resume(agentId)` で会話復元
- `local.store` で JSONL / カスタム backend に差し替え可

## Run API 要点

- `run.stream()` / `run.messages()` — 観測用
- `run.wait()` — 終端結果（**必須**）
- `run.cancel()` — `supports("cancel")` でガード
- `run.conversation()` — 構造化履歴
- `run.requestId` — ログ相関用 UUID（成功/失敗両方で有用）
- detached run（`Agent.getRun` 再取得）は全操作非対応のことがある → `run.supports(op)`

## new-cursor アーキテクチャへの示唆

本プロジェクト（`docs/AGREEMENTS.md`）: イベント駆動 + SQS Worker + git worktree + Cursor SDK 実行。

### Worker 設計

- **タスク = 1 worktree + 1 Agent** が自然
  - `Agent.create({ local: { cwd: worktreePath } })` で worktree を cwd に
  - タスク再開時は DB に保存した `agentId` で `Agent.resume`
- **SQS メッセージ処理**
  - 待機→再開: `agentId` + 追加プロンプトを `agent.send` → `wait`
  - ワンショット検証だけなら `Agent.prompt` も可（dispose 自動）
- **必ず dispose** — Worker は long-running なので `with` / `await using` 必須

### 状態永続化

- Agent ID / Run ID / requestId を DB（実行記録）に保存
- Local agent: checkpoint store が会話を保持 → Worker 再起動後も resume 可能
- Cloud agent: `bc-*` ID で API 経由再 attach。VM 側は切断耐性あり

### エラーと SQS リトライ

- `CursorAgentError` + `isRetryable` → SQS visibility timeout / DLQ 設計
- `result.status === "error"` → タスク失敗として記録、リトライ方針は別（重複実行リスク）
- Cloud の `AgentBusyError` — 同一 agent への並行 send 禁止。Worker は 1 agent 1 run を守る

### MCP / ルール注入

- 工程ごと MCP 切替 → **send 時に `mcpServers` をタスク種別で差し替え**（置換 semantics に注意）
- DB ルール注入はプロンプト文字列側。SDK の `subagents` / hooks とは別レイヤ
- resume 時 MCP 再渡しを Worker 実装に含める

### Local vs Cloud 選定

| シナリオ | 推奨 |
| --- | --- |
| worktree 上で実装・コミット・PR | **Local**（既存 checkout/worktree を cwd に） |
| リポジトリ未 checkout・大量並列 | **Cloud** |
| docker-compose Worker | Local 実行が合意（`docs/AGREEMENTS.md`）と整合 |

### CI / PR 連携

- Cloud: `autoCreatePR: true`, `result.git.branches[].prUrl` で PR URL 取得
- Local: git 操作は agent ツール経由。PR 作成は GitHub プラグイン/MCP 側

## 未確認・要決定（open questions）

- new-cursor Worker の言語（TypeScript vs Python）— 既存コードベース次第
- Local checkpoint store を Worker コンテナ内に置くか、共有 volume か
- Cloud agent をいつ使うか（全タスク local 固定 vs ハイブリッド）
- MCP サーバー定義を DB/タスク設定から組み立てるスキーマ
- `local.autoReview: true` で Shell/MCP をゲートするか（headless デフォルトは自動承認）
