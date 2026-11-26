---
sourceRefs: [SRC-claude-code-memory-load-20261126, SRC-claude-code-memory-rules-20261126, SRC-claude-code-context-window-20261126, SRC-claude-code-permission-order-20261126, SRC-claude-code-permission-rules-20261031, SRC-claude-code-settings-20261031, SRC-claude-code-permission-modes-20261126]
---
## 知識問題

### Q1. リポジトリ直下で Claude Code を起動します。組織、ユーザー、プロジェクト、プロジェクトのローカル用に約束があります。指示が読み込まれる順序はどれですか？
<!-- kind: single; skills: claude-code-config -->

- A. プロジェクト、ローカル、ユーザー、組織の順で、4 つとも加わる
- B. 組織、ユーザー、プロジェクト、ローカルの順で、4 つとも加わる
- C. 組織とユーザーが先に加わり、ローカルがプロジェクトの指示を置き換える

<details>
<summary>解答</summary>

**B** — 広い範囲から順に、見つけた指示を連結します。ローカル用の指示も、プロジェクトの指示に続けて読み込みます。

</details>

### Q2. 在庫テストを触るときだけ、在庫が 0 件の場合を扱うように伝えたいです。どこに書きますか？
<!-- kind: single; skills: claude-code-config -->

- A. ルートの CLAUDE.md に「テストには境界値を含める」とだけ書く
- B. 在庫テストの約束を毎回読み込むルールにして、対象のパスを文章で説明する
- C. .claude/rules/ のファイルに paths を書き、在庫テストのパスを指定する

<details>
<summary>解答</summary>

**C** — パスを指定すると、該当するファイルを扱うときにルールが読み込まれます。

</details>

### Q3. 在庫のテストだけに使うルールを読んだあと、会話を圧縮しました。まだテストを開き直していません。ルールをもう一度読み込ませるにはどうしますか？
<!-- kind: single; skills: claude-code-config -->

- A. 在庫のテストファイルを再び読むか編集する
- B. パス指定を外して全ファイルの作業に適用する
- C. もう一度 /compact して、要約を短くする

<details>
<summary>解答</summary>

**A** — パス指定のあるルールは、該当するファイルを扱った時点で読み直されます。

</details>

### Q4. 共有設定は npm run publish-* を拒否しています。個人の設定で npm run publish-preview だけ許可しました。試験用の公開を頼むとどうなりますか？
<!-- kind: single; skills: claude-code-config -->

- A. 許可の条件のほうが細かいので実行される
- B. 共有設定の拒否に一致するので実行されない
- C. 2 つのルールが一致するので、その場で人に確認する

<details>
<summary>解答</summary>

**B** — ルールは拒否、確認、許可の順で照合します。最初に一致した拒否が効きます。

</details>

### Q5. 受注画面の不具合を直す前に、関係するファイルと直す方針を調べます。担当者の確認まではソースを編集させたくありません。最初にどのモードを選びますか？
<!-- kind: single; skills: claude-code-config -->

- A. acceptEdits を選び、変更があれば差分で確認する
- B. auto を選び、調査だけにするよう会話で伝える
- C. plan を選び、調査と計画を先に行う

<details>
<summary>解答</summary>

**C** — plan は編集に入る前の調査と計画に使います。

</details>

### Q6. チームは auto で通常の確認を減らしています。Bash の呼び出し自体を禁止する要件が追加されました。何を設定しますか？
<!-- kind: single; skills: claude-code-config -->

- A. Bash を共有する権限設定の deny に入れる
- B. auto のまま、CLAUDE.md にコマンドを控えるよう追記する
- C. Manual に替え、Bash の呼び出しをそのたびに担当者が審査する

<details>
<summary>解答</summary>

**A** — ツール名だけの拒否は、そのツールを候補から外します。auto を使っているセッションでも拒否は効きます。

</details>
