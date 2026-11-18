---
title: 担当者が指示したときだけ議事録を配る
sourceRefs: [SRC-claude-code-skills-20261118]
---
## 知識問題

### Q1. 議事録を参加者へ配布する Claude Code スキルがあります。普段は下書きの校正だけを行い、担当者が明示的にスキルを呼んだときだけ配布の手順を読み込ませます。どの設定が合いますか。
<!-- kind: single; skills: claude-code-config -->

- A. 説明に『便利なときは配る』と書き、Claude に毎回判断させる
- B. スキルの先頭に disable-model-invocation: true を指定し、担当者がコマンドで呼ぶ
- C. 配布の手順をプロジェクトの CLAUDE.md の先頭に書いて毎回読み込ませる

<details>
<summary>解答</summary>

**B** — この設定で、Claude が自分の判断でスキルを呼び出すのを止められます。担当者が明示的に呼び出す経路は残ります。配布先へのアクセス権は実行側でも確認します。 基礎の復習は「毎回効かせる約束」です。

</details>
