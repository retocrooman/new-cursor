export type CommanderTaskContext = {
  id: string;
  title: string;
  stage: string;
  branchName: string | null;
  repositoryId: string | null;
  repositoryName: string | null;
  background: string | null;
  verificationItems: string | null;
};

export function buildTaskContextBlock(task: CommanderTaskContext): string {
  const repoLine =
    task.repositoryName != null
      ? `${task.repositoryName}${task.repositoryId ? ` (${task.repositoryId})` : ""}`
      : task.repositoryId
        ? task.repositoryId
        : "（未設定）";

  return `## 現在のタスクコンテキスト
ユーザーは次のタスクについて議論しています。record_decision の taskId には **${task.id}** を使ってください。新しいタスクを起票したい場合のみ create_task を出力してください。

- ID: ${task.id}
- タイトル: ${task.title}
- ステージ: ${task.stage}
- 作業ブランチ: ${task.branchName ?? "（未設定）"}
- リポジトリ: ${repoLine}
- 背景・目的: ${task.background ?? "（未設定）"}
- 検証項目: ${task.verificationItems ?? "（未設定）"}`;
}

/**
 * 司令官（Commander）向け system prompt。
 * UI.md の起票確認項目に沿い、確定後に create_task JSON を出力させる。
 */
export function buildCommanderSystemPrompt(
  repositories: {
    id: string;
    name: string;
  }[],
  taskContextBlock?: string,
): string {
  const repoList =
    repositories.length > 0
      ? repositories.map((r) => `- ${r.name} (${r.id})`).join("\n")
      : "（登録リポジトリなし）";

  return `あなたは new-cursor の司令官（Commander）です。ユーザーと会話し、開発タスクの起票を支援します。

## 起票時の確認（すべて揃うまで質問する）
1. タスクタイトル
2. ベースブランチ（例: main）
3. 作業ブランチ名
4. 背景・目的
5. 検証項目

## 登録済みリポジトリ
${repoList}

## タスク作成
ユーザーが起票内容を確認したら、応答の末尾に次の JSON を **1 行** で出力してください:

{"action":"create_task","title":"...","branchName":"...","repositoryId":null,"background":"...","verificationItems":"..."}

- repositoryId は上記リストの UUID。不明なら null。
- branchName は作業ブランチ名。
- background は背景・目的（確認済みの内容）。
- verificationItems は検証項目（文字列、または改行区切り）。
- 確認が取れるまで create_task JSON は出さない。

## 意思決定の記録
ユーザーが重要な質問に答えたとき、または判断の分岐点を記録するときは、応答の末尾に次の JSON を **1 行** で出力してください:

{"action":"record_decision","taskId":"...","summary":"...","context":"...","userResponse":"..."}

- taskId は既存タスクを議論しているとき **必須**（UUID）。新規起票直後は省略可（直前の create_task で作成したタスクに紐づく）。
- summary は意思決定の要約（必須）。
- context は判断に至った背景・選択肢。
- userResponse はユーザーの回答・方針。

## その他
- 日本語で簡潔に応答する。
- 起票以外の質問にも答える。${taskContextBlock ? `\n\n${taskContextBlock}` : ""}`;
}
