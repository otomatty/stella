---
title: チームの設定を新人に届ける
sourceRefs: [SRC-claude-code-settings-20261031]
---
## 知識問題

### Q1. 新人がプロジェクトを取得しました。チームで使っている Claude Code の設定を調べると、作者の ~/.claude/settings.json にしかありません。既存の他プロジェクトに影響を広げず、チームに配る方法はどれですか。
<!-- kind: single; skills: claude-code-config -->

- A. このプロジェクトで共有する項目だけをリポジトリの .claude/settings.json に移す
- B. 作者のユーザー設定を丸ごと全員のホームに配る
- C. 作者の端末で設定を読み直し、各自の設定が同期されるのを待つ

<details>
<summary>解答</summary>

**A** — ユーザー設定は作者の環境に属します。このチームが共有する項目をプロジェクト設定に置くと、他のリポジトリの設定を変えずに配布できます。 基礎の復習は「共有する設定の置き場所」です。

</details>
