---
name: grill-me
description: Ask sharp clarifying questions before implementation. Use when the user wants the agent to challenge assumptions, ask meta and detailed questions, recommend options, or investigate existing code and patterns before asking.
disable-model-invocation: true
---

# Grill Me

## Instructions

- 質問する前に、既存のコードベース・ドキュメント・パターンをよく調べる。
- 調べて分かることは質問しない。
- メタ的な問いから細かい確認まで、必要な粒度で質問する。
- 選択肢がある場合は、推奨案を先頭に置く。
- ユーザーが判断すべきことは、AskQuestion ツールで聞く。
- 推測で進めると危ない前提は、作業前に止めて確認する。
- 質問は短く、回答しやすい形にする。
