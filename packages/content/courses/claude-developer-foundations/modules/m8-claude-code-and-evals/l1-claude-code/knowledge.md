---
sourceRefs: [SRC-claude-code-memory-20261031, SRC-claude-code-hooks-guide-20261031, SRC-claude-code-settings-20261031]
---
## 知識問題

### Q1. チームで使うテストの走らせ方を、Claude Code に毎回伝えたいです。書く場所として適切なものはどれですか？
<!-- kind: single; skills: claude-code-config -->

- A. プロジェクトの CLAUDE.md
- B. 自分の ~/.claude/CLAUDE.md
- C. CLAUDE.local.md

<details>
<summary>解答</summary>

**A** — プロジェクトの CLAUDE.md はリポジトリに入れてチームで共有します。B と C は自分にしか効きません。

</details>

### Q2. CLAUDE.md の書き方として適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-code-config -->

- A. 「コミットの前に npm test を走らせる」のように、確かめられる形で書く
- B. 1 つのファイルを 200 行より短く保つ
- C. 「コードを整える」のように、広く書く
- D. 食い違う指示がないか、ときどき見直す

<details>
<summary>解答</summary>

**A, B, D** — 長いファイルはコンテキストを使い、守られにくくなります。

</details>

### Q3. .env を絶対に書き換えさせたくありません。確実な方法はどれですか？
<!-- kind: single; skills: claude-code-config -->

- A. PreToolUse のフックで、.env への書き換えを止める
- B. CLAUDE.md に「.env は書き換えない」と書く
- C. 自動メモリーに覚えさせる

<details>
<summary>解答</summary>

**A** — CLAUDE.md と自動メモリーは指示として読まれるだけで、必ず守られる設定ではありません。

</details>

### Q4. PreToolUse のフックが終了コード 2 で終わると、どうなりますか？
<!-- kind: single; skills: claude-code-config -->

- A. ツールの呼び出しが止まり、標準エラーの理由が Claude に伝わる
- B. ツールの呼び出しが確認なしで許可される
- C. 何も起きない

<details>
<summary>解答</summary>

**A** — 終了コード 0 は「反対しない」で、許可したことにはならず、ふつうの権限の確認に進みます。

</details>

### Q5. 同じ設定の項目が、ユーザーの設定とプロジェクトの .claude/settings.json の両方にあります。どちらが使われますか？
<!-- kind: single; skills: claude-code-config -->

- A. プロジェクトの .claude/settings.json
- B. ユーザーの ~/.claude/settings.json
- C. 先に読まれたほう

<details>
<summary>解答</summary>

**A** — 強い順に、管理された設定・コマンドライン・プロジェクトのローカル・共有するプロジェクト・ユーザーです。ただし permissions.allow のような一覧は足し合わされます。

</details>
