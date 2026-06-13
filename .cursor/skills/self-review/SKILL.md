---
name: self-review
description: Review the agent's own work after completing a task. Use when the user asks for self-review, reflection, or improvement after changes.
disable-model-invocation: true
---

# Self Review

## Instructions

- 作業後に、要件を満たしているか確認する。
- 差分が最小限か確認する。
- 不要な変更や過剰な実装がないか確認する。
- 実行した検証と、未検証のことを分けて書く。
- UI 変更時は cursor-ide-browser（use-browser）での確認結果も含める（`.cursor/rules/ui-browser-verification.mdc` 参照）。
- 次回改善できるルール候補があれば箇条書きで出す。
- 改善事項が明確で安全に直せる場合は、報告だけで終わらず修正まで行う。
- 指摘は短く、具体的に書く。
