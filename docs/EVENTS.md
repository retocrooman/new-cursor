# 代表イベント一覧

- 目的
  - new-cursor のイベント駆動アーキテクチャで扱う代表イベントをカタログ化する。
  - 実装の JSON スキーマや詳細仕様は別途定義する。ここでは名前・発火元・概要・購読者・連鎖の目安を示す。
- 読み方
  - 各イベントは「イベント名 / 発火元 / 概要ペイロード / 主な購読者・処理 / 次に発火しうるイベント」の順で記載する。
  - ペイロードはキー名のみ。値の型や必須条件は省略する。
  - 関連する合意は [AGREEMENTS.md](./AGREEMENTS.md) を参照する。

## イベントの種類

- ドメインイベント
  - 司令室（apps/web）がタスク・実行記録の状態変化を表すイベント。トランザクション内で outbox に書く。
  - 例：`task.created`、`task.stage.changed`。ES/CQRS の記録対象は task と run のみ。
- SQS 配送メッセージ
  - relay が outbox を読み取り ElasticMQ（ローカル SQS）へ publish するメッセージ。Worker が inbox で冪等受信する。
  - ドメインイベントをラップし、`eventId`・`eventType`・`payload`・`occurredAt` などを含む。
  - 同一イベントを複数エージェントが購読できる。SQS では 1 件 1 消費とする。
- 外部 Webhook
  - GitHub・Slack など業務アプリから届く事実。司令室が受信し、必要に応じてドメインイベントへ変換して outbox に書く。
  - 例：PR マージ、CI 完了、Slack 承認。変換後は SQS 配送と同じルーティングに乗る。

## タスクライフサイクル

- `task.created`
  - 発火元：司令官チャット（apps/web 内 Cursor Agent SDK）または API。
  - 概要ペイロード：`taskId`、`repositoryId`、`title`、`baseBranch`、`branchName`、`context`、`verificationItems`。
  - 主な購読者・処理：司令室がタスクを DB に保存し、固定工程の起票を完了する。購読条件に一致するエージェントへルーティングする。
  - 次に発火しうるイベント：`task.worktree.requested`、`task.stage.changed`。
- `task.worktree.requested`
  - 発火元：司令室（起票完了後の次処理決定）。
  - 概要ペイロード：`taskId`、`repositoryId`、`branchName`、`worktreePath`。
  - 主な購読者・処理：Worker が WORKTREE_ROOT 上に git worktree とブランチを作成する。
  - 次に発火しうるイベント：`task.worktree.ready`、`task.failed`。
- `task.worktree.ready`
  - 発火元：Worker（worktree 作成完了）。
  - 概要ペイロード：`taskId`、`worktreePath`、`branchName`。
  - 主な購読者・処理：司令室が実装工程へ遷移させ、実行キューへ載せる。同一 repo+branch の競合があれば直列キューで待機する。
  - 次に発火しうるイベント：`task.stage.changed`、`task.queued`。
- `task.stage.changed`
  - 発火元：司令室（固定工程の遷移：起票 → 実装 → 検証 → 完了）。
  - 概要ペイロード：`taskId`、`fromStage`、`toStage`、`reason`。
  - 主な購読者・処理：司令室が run 記録を残す。購読条件に一致するエージェントへ作業依頼をルーティングする。
  - 次に発火しうるイベント：`run.started`、`task.waiting`。
- `task.queued`
  - 発火元：司令室（repo+branch 競合により直列待ち）。
  - 概要ペイロード：`taskId`、`repositoryId`、`branchName`、`queuePosition`。
  - 主な購読者・処理：司令室が競合解消を監視する。先行タスク完了後に再開する。
  - 次に発火しうるイベント：`task.resumed`、`run.started`。
- `run.started`
  - 発火元：司令室（Worker 起動指示）または Worker（実行開始報告）。
  - 概要ペイロード：`taskId`、`runId`、`agentId`、`stage`、`worktreePath`。
  - 主な購読者・処理：Worker が Local Cursor SDK で worktree を cwd として 1 件実行する。ルールを DB から注入する。
  - 次に発火しうるイベント：`run.completed`、`run.failed`、`task.waiting`。
- `run.completed`
  - 発火元：Worker（1 回の実行完了）。
  - 概要ペイロード：`taskId`、`runId`、`agentId`、`summary`、`filesChanged`、`tokensUsed`。
  - 主な購読者・処理：司令室が run 記録を更新し、次工程または完了判定を行う。
  - 次に発火しうるイベント：`task.stage.changed`、`task.pr.requested`、`task.completed`、`task.waiting`。
- `task.waiting`
  - 発火元：司令室（承認・CI・マージ・子タスク完了など外部きっかけ待ち）。
  - 概要ペイロード：`taskId`、`waitingFor`、`waitingSince`、`resumeCondition`。
  - 主な購読者・処理：司令室が状態を保存する。UI に待機理由を表示する。
  - 次に発火しうるイベント：`task.resumed`。
- `task.resumed`
  - 発火元：司令室（待機条件が満たされたとき）。
  - 概要ペイロード：`taskId`、`resumedBy`、`resumeReason`。
  - 主な購読者・処理：司令室が同じタスクを再開し、中断前の工程から処理を続ける。
  - 次に発火しうるイベント：`task.stage.changed`、`run.started`。
- `task.pr.requested`
  - 発火元：司令室（実装・検証完了後）。
  - 概要ペイロード：`taskId`、`repositoryId`、`branchName`、`title`、`worktreePath`。
  - 主な購読者・処理：Worker が変更をコミットし PR を作成する。
  - 次に発火しうるイベント：`task.pr.created`、`task.failed`。
- `task.pr.created`
  - 発火元：Worker（PR 作成完了）または GitHub Webhook 受信後の変換。
  - 概要ペイロード：`taskId`、`pullRequestUrl`、`pullRequestNumber`。
  - 主な購読者・処理：司令室が検証工程へ進めるか、承認待ちにする。
  - 次に発火しうるイベント：`task.stage.changed`、`task.waiting`、`ci.started`。
- `task.completed`
  - 発火元：司令室（完了条件充足：承認・PR マージ・検証 OK など）。
  - 概要ペイロード：`taskId`、`completedAt`、`summary`。
  - 主な購読者・処理：司令室がタスクをクローズする。競合キューの次タスクを解放する。振り返りを起動しうる。
  - 次に発火しうるイベント：`task.retrospective.requested`、`task.resumed`（キュー内の別タスク）。
- `task.failed`
  - 発火元：司令室または Worker（回復不能な失敗）。
  - 概要ペイロード：`taskId`、`runId`、`error`、`stage`。
  - 主な購読者・処理：司令室が失敗を記録する。エスカレーションまたは手動対応へ誘導する。
  - 次に発火しうるイベント：`task.escalation.requested`、`task.waiting`。

## 問題起票（エスカレーション）

- `task.escalation.requested`
  - 発火元：司令室（親タスクがブロックしたとき）。
  - 概要ペイロード：`parentTaskId`、`reason`、`blockedStage`。
  - 主な購読者・処理：司令室が親をブロックし、問題用の子タスクを起票する。
  - 次に発火しうるイベント：`task.created`（子）、`task.waiting`（親）。
- `task.created`（子タスク）
  - 発火元：司令室（エスカレーション起票）。
  - 概要ペイロード：`taskId`、`parentTaskId`、`title`、`repositoryId`、`branchName`、`escalationReason`。
  - 主な購読者・処理：子タスクは通常の固定工程で進行する。親とは `parentTaskId` で紐づく。
  - 次に発火しうるイベント：タスクライフサイクル各イベント（子タスク用）。
- `task.escalation.resolved`
  - 発火元：司令室（子タスク完了を検知）。
  - 概要ペイロード：`parentTaskId`、`childTaskId`、`resolution`。
  - 主な購読者・処理：司令室が親タスクの待機を解除し、再開する。
  - 次に発火しうるイベント：`task.resumed`（親）。

## 承認

- `approval.requested`
  - 発火元：司令室（検証工程で人間確認が必要なとき）。
  - 概要ペイロード：`taskId`、`requestedBy`、`summary`、`pullRequestUrl`。
  - 主な購読者・処理：UI に承認ボタンを表示する。Slack 通知を送りうる。
  - 次に発火しうるイベント：`approval.granted`、`approval.rejected`。
- `approval.granted`
  - 発火元：UI 承認ボタン（MVP）または Slack 承認 Webhook の変換。
  - 概要ペイロード：`taskId`、`approvedBy`、`approvedAt`。
  - 主な購読者・処理：司令室が PR auto-merge を依頼するか、完了判定へ進める。
  - 次に発火しうるイベント：`task.resumed`、`pr.merge.requested`。
- `approval.rejected`
  - 発火元：UI または Slack。
  - 概要ペイロード：`taskId`、`rejectedBy`、`comment`。
  - 主な購読者・処理：司令室が実装工程へ戻すか、タスクを待機・失敗にする。
  - 次に発火しうるイベント：`task.stage.changed`、`task.waiting`、`task.failed`。
- `pr.merge.requested`
  - 発火元：司令室（承認後の auto-merge）。
  - 概要ペイロード：`taskId`、`pullRequestNumber`、`repositoryId`。
  - 主な購読者・処理：Worker または GitHub 連携が PR をマージする。
  - 次に発火しうるイベント：`pr.merged`。
- `pr.merged`
  - 発火元：GitHub Webhook（PR マージ完了）の変換。
  - 概要ペイロード：`taskId`、`pullRequestNumber`、`mergedAt`、`mergeCommitSha`。
  - 主な購読者・処理：司令室がタスクを完了にする。ブランチ状態を更新する。
  - 次に発火しうるイベント：`task.completed`、`task.resumed`（競合キュー）。

## CI 連携

- `ci.started`
  - 発火元：GitHub Webhook（CI 開始）の変換。
  - 概要ペイロード：`taskId`、`repositoryId`、`commitSha`、`workflowName`。
  - 主な購読者・処理：司令室が CI 実行中として記録する。UI に状態を反映する。
  - 次に発火しうるイベント：`ci.completed`。
- `ci.completed`
  - 発火元：GitHub Webhook（CI 完了）の変換。
  - 概要ペイロード：`taskId`、`status`（`success` / `failure`）、`checkRuns`、`pullRequestNumber`。
  - 主な購読者・処理：司令室が結果をタスク状態に反映し、次工程を決める。
  - 次に発火しうるイベント：`task.stage.changed`、`task.resumed`、`task.waiting`、`task.failed`。
- `branch.conflict.detected`
  - 発火元：Worker または司令室（開始時・完了前のブランチ確認、マージ時）。
  - 概要ペイロード：`taskId`、`repositoryId`、`branchName`、`conflictFiles`。
  - 主な購読者・処理：司令室が解消を依頼するか、直列キューで待機する。解消後に再開する。
  - 次に発火しうるイベント：`branch.conflict.resolved`、`task.queued`、`task.waiting`。
- `branch.conflict.resolved`
  - 発火元：Worker（コンフリクト解消完了）。
  - 概要ペイロード：`taskId`、`resolvedBy`、`resolutionSummary`。
  - 主な購読者・処理：司令室が実装・検証を再開する。
  - 次に発火しうるイベント：`task.resumed`、`run.started`。

## リポジトリ登録

- `repository.registered`
  - 発火元：司令室（ユーザーがリポジトリを登録したとき）。
  - 概要ペイロード：`repositoryId`、`name`、`remoteUrl`、`isExternal`。
  - 主な購読者・処理：外部リポジトリなら clone ジョブを起動する。DB にメタデータを保存する。
  - 次に発火しうるイベント：`repository.clone.requested`。
- `repository.clone.requested`
  - 発火元：司令室（外部 repo 登録後）。
  - 概要ペイロード：`repositoryId`、`remoteUrl`、`clonePath`。
  - 主な購読者・処理：Worker がホスト上で clone する。
  - 次に発火しうるイベント：`repository.clone.completed`、`repository.clone.failed`。
- `repository.clone.completed`
  - 発火元：Worker（clone 成功）。
  - 概要ペイロード：`repositoryId`、`clonePath`、`defaultBranch`。
  - 主な購読者・処理：司令室がリポジトリを利用可能にする。タスク起票を受け付ける。
  - 次に発火しうるイベント：なし（待機）。以降 `task.created` が利用可能になる。
- `repository.clone.failed`
  - 発火元：Worker（clone 失敗）。
  - 概要ペイロード：`repositoryId`、`error`。
  - 主な購読者・処理：司令室が登録状態をエラーにし、再試行を促す。
  - 次に発火しうるイベント：`repository.clone.requested`。

## 定期実行（cron）

- `cron.tick`
  - 発火元：apps/web または専用スケジューラ（cron 式）。
  - 概要ペイロード：`scheduleId`、`cronExpression`、`firedAt`。
  - 主な購読者・処理：司令室が該当する定期ジョブ定義を評価する。
  - 次に発火しうるイベント：`cron.job.triggered`。
- `cron.job.triggered`
  - 発火元：司令室（定期ジョブ種別に応じた起動）。
  - 概要ペイロード：`jobType`（`security_scan` / `performance_scan` / `refactor_proposal` / `rule_improvement`）、`repositoryId`、`parameters`。
  - 主な購読者・処理：司令室が新規タスクを起票するか、既存タスクに run を追加する。
  - 次に発火しうるイベント：`task.created`、`run.started`。
- `cron.rule_improvement.triggered`
  - 発火元：司令室（自己改善用 cron）。
  - 概要ペイロード：`period`、`targetLabels`、`runCount`。
  - 主な購読者・処理：司令室が実行記録を集計し、ルール候補の見直しタスクを起動する。
  - 次に発火しうるイベント：`task.created`、`task.retrospective.requested`。

## イベントフロー（汎用オートメーション）

- `eventflow.definition.saved`
  - 発火元：司令室 API（oRPC CRUD。UI は後回し）。
  - 概要ペイロード：`flowId`、`name`、`trigger`、`actions`、`emitEvents`。
  - 主な購読者・処理：司令室が DB に定義を保存し、ルーティング評価に使う。
  - 次に発火しうるイベント：なし（定義の保存のみ）。
- `eventflow.trigger.matched`
  - 発火元：司令室（任意のドメインイベントまたは Webhook 受信時にトリガー条件を評価）。
  - 概要ペイロード：`flowId`、`sourceEventType`、`sourceEventId`、`matchedPayload`。
  - 主な購読者・処理：司令室が定義どおりのアクションを実行する（通知・API 呼び出し・状態更新など）。
  - 次に発火しうるイベント：`eventflow.action.completed`。
- `eventflow.action.completed`
  - 発火元：司令室（アクション完了後）。
  - 概要ペイロード：`flowId`、`actionResults`、`sourceEventId`。
  - 主な購読者・処理：司令室が定義どおりの次イベントを outbox に書く。SQS 経由で Worker に届けうる。
  - 次に発火しうるイベント：フロー定義で指定した任意のドメインイベント（例：`task.created`、`run.started`）。

## Outbox / Inbox（配送層）

- `outbox.written`
  - 発火元：司令室 DB トランザクション（ドメインイベント永続化と同一コミット）。
  - 概要ペイロード：`outboxId`、`eventType`、`aggregateId`、`payload`、`createdAt`。
  - 主な購読者・処理：apps/relay が未配送行をポーリングする。アプリ内の直接購読はしない。
  - 次に発火しうるイベント：`outbox.relayed`。
- `outbox.relayed`
  - 発火元：apps/relay（ElasticMQ への publish 成功）。
  - 概要ペイロード：`outboxId`、`sqsMessageId`、`queueUrl`、`relayedAt`。
  - 主な購読者・処理：relay が outbox 行を配送済みに更新する。
  - 次に発火しうるイベント：なし（SQS キュー上のメッセージとして Worker が受信）。
- `inbox.received`
  - 発火元：apps/worker（SQS 受信・処理開始）。
  - 概要ペイロード：`inboxId`、`eventId`、`eventType`、`sqsReceiptHandle`。
  - 主な購読者・処理：Worker が `eventId` で冪等チェックし、未処理ならハンドラを実行する。
  - 次に発火しうるイベント：ハンドラに応じたドメインイベントまたは Worker 完了報告。
- `inbox.processed`
  - 発火元：apps/worker（処理成功）。
  - 概要ペイロード：`inboxId`、`eventId`、`processedAt`、`handlerResult`。
  - 主な購読者・処理：Worker が inbox を完了にし、SQS メッセージを削除する。
  - 次に発火しうるイベント：司令室への完了報告イベント（例：`run.completed`、`repository.clone.completed`）。
- `inbox.duplicate.skipped`
  - 発火元：apps/worker（同一 `eventId` の再配送）。
  - 概要ペイロード：`inboxId`、`eventId`、`originalProcessedAt`。
  - 主な購読者・処理：Worker が副作用なくスキップし、メッセージを削除する。
  - 次に発火しうるイベント：なし。

## 補足

- 固定工程とイベントフロー
  - 固定工程（起票 → 実装 → 検証 → 完了）は `task.stage.changed` で表す。イベントフローは工程を横断する汎用連鎖であり、両者を併用する。
- 購読ルーティング
  - エージェントごとに購読するイベント種別とフィルタを設定する。`task.stage.changed` や `run.started` などから、条件一致するエージェントへ SQS で 1 件ずつ届ける。
- UI 表示
  - タスクリストの「最後のイベント」、ダッシュボードの「イベントヒストリー」は、上記ドメインイベントの要約を表示する。詳細は [UI.md](./UI.md)。
