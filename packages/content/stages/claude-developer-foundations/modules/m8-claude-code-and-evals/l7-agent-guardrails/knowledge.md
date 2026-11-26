---
sourceRefs: [SRC-claude-sdk-hooks-20261118, SRC-claude-sdk-hook-callbacks-20261126, SRC-claude-sdk-hook-failure-20261126, SRC-claude-code-sdk-permissions-20261031, SRC-claude-code-sdk-permission-rules-20261031, SRC-claude-sdk-settings-sources-20261126]
---
## 知識問題

### Q1. 監査エージェントに帳票を読む作業を任せます。Write と Edit を呼んだ時点で必ず止めるには、どこに条件を置きますか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. CLAUDE.md の帳票を扱う手順に、閲覧に限るという指示を足す
- B. PreToolUse に Write と Edit に対して deny を返す関数を登録する
- C. PostToolUse に Write と Edit の結果を記録する関数を登録する

<details>
<summary>解答</summary>

**B** — 実行前にハーネスが拒否を受け取るので、対象のツールは動きません。

</details>

### Q2. フックがある編集を許可しました。同じ編集がチームの拒否ルールにも一致します。この呼び出しはどうなりますか？
<!-- kind: single; skills: claude-code-config -->

- A. 最初に動くフックの許可で実行される
- B. 権限モードが bypassPermissions のときに実行される
- C. 拒否ルールの判定で止まる

<details>
<summary>解答</summary>

**C** — フックが許可を返しても拒否ルールを調べます。拒否ルールは権限モードより先に評価されます。

</details>

### Q3. アプリは allowedTools で Read を自動承認しています。canUseTool に閲覧の検査を置いたところ、検査を通らずにファイルが読まれました。すべての Read を検査するにはどうしますか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. Read に一致する PreToolUse に検査を移す
- B. Read の説明に、読む前に検査を受けるという指示を足す
- C. canUseTool に拒否理由も返すようにして記録を詳しくする

<details>
<summary>解答</summary>

**A** — 自動承認は canUseTool より先に決まります。PreToolUse ならその前に検査できます。

</details>

### Q4. 編集前に承認記録を調べるフックが、記録を読めず例外を投げました。記録を調べられない場合にも編集を拒否するにはどうしますか？
<!-- kind: single; skills: claude-safety -->

- A. 例外を記録してから空の結果を返す
- B. フックの matcher に onFailure: "block" を指定する
- C. 編集の依頼に、記録が読めるか確認する手順をもう一度書く

<details>
<summary>解答</summary>

**B** — onFailure の設定があれば、ハーネスはフックの失敗時も対象の操作を遮断します。

</details>

### Q5. 調査サービスは query() に登録したフックを使います。利用者のリポジトリに置かれた .claude/settings.json のフックが実行されました。ユーザー・プロジェクト・ローカル設定を読み込まないようにするにはどうしますか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. 設定の読み込みは既定に任せ、query() で同じツールを対象にするフックを重ねる
- B. 依頼にリポジトリの設定を使わないよう指示する
- C. query() の options に settingSources: [] を指定する

<details>
<summary>解答</summary>

**C** — 空の配列は 3 つの設定元の読み込みを無効にします。options.hooks に登録したフックは使えます。

</details>

### Q6. Write と Edit をフックで拒否しました。帳票の調査に Bash は不要ですが、今の構成では使えます。Bash からの書き込みを防ぐにはどうしますか？
<!-- kind: single; skills: claude-safety -->

- A. disallowedTools で Bash を外す
- B. フックの拒否理由に、Bash でも書き込まないよう追記する
- C. allowedTools に Read を追加し、ほかの設定はそのまま使う

<details>
<summary>解答</summary>

**A** — matcher は Write と Edit にだけ一致します。不要な Bash を外すと、その経路から書き込めなくなります。

</details>
