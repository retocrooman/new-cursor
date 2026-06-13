---
name: trust-sub-work
description: Run sub-work in a worktree then create a trust PR. Use when the user wants subagent work followed by auto-merge PR.
disable-model-invocation: true
---

# Trust Sub Work

## Instructions

### Sub Work

- 必ずサブエージェントに作業を任せる。
- 必ず worktree で実行する。
- 実行前にベースブランチをユーザーに確認する。
- 実行前に作業ブランチをユーザーに確認する。
- 実装前に不明点があれば、必ず親エージェントで仕様確認する。

### Trust PR（作業完了後）

- ユーザーがコミットを依頼した場合のみコミットする。
- PR 作成前に現在ブランチと push 状態を確認する。
- 未 push の場合は、PR 作成前に push する。
- PR は `--auto-merge` を付けて作成する。
- PR 作成後は、PR URL だけ簡潔に伝える。
