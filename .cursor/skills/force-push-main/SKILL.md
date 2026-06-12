---
name: force-push-main
description: Execute dangerous force-push workflows with --force-with-lease only after explicit confirmation. Use when the user intentionally requests force push, push --force-with-lease, main, master, or protected branch rewriting.
disable-model-invocation: true
---

# Force Push With Lease

## Instructions

- 危険性を短く警告したうえで、ユーザーが明示した場合は実行する。
- 実行前に現在ブランチ・remote・push先を確認する。
- 実行前に差分・直近コミット・リモートとの差を確認する。
- 実行前に対象ブランチとコマンドをユーザーへ再確認する。
- force push は必ず `--force-with-lease` で実行する。
- 実行後に push 結果と現在状態を確認する。
