---
sourceRefs: [SRC-claude-code-agent-sdk-overview-20261031, SRC-claude-code-agent-loop-20261031, SRC-claude-code-agent-loop-control-20261031, SRC-claude-code-sdk-subagents-20261031, SRC-claude-code-sdk-subagents-create-20261031, SRC-claude-code-sdk-sessions-20261031, SRC-claude-sdk-hooks-20261118, SRC-claude-developer-guide-v11-20261118]
---
## 知識問題

### Q1. Agent SDK と Client SDK の違いとして正しいものはどれですか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. Agent SDK はツールを実行するループを持ち、Client SDK ではループをアプリが書く(ツールランナーに任せることもできる)
- B. Client SDK だけがツールを使える
- C. Agent SDK は Claude の API を使わない

<details>
<summary>解答</summary>

**A** — Agent SDK は Claude Code のエージェントを組み込むライブラリで、最初から入っているツールや権限の確認も持っています。

</details>

### Q2. query の最後に届く ResultMessage の result を読む前に、確かめるものはどれですか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. subtype が success であること
- B. session_id があること
- C. 使ったトークンが 0 でないこと

<details>
<summary>解答</summary>

**A** — result は success のときにしか入りません。error_max_turns などで止まったときは入っていません。

</details>

### Q3. 長く動くエージェントの費用を抑える設定として適切なものはどれですか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. maxBudgetUsd で費用の上限を決める
- B. 何も設定しない(既定で上限がある)
- C. allowedTools を空にする

<details>
<summary>解答</summary>

**A** — maxTurns と maxBudgetUsd は、どちらも既定では上限がありません。費用の上限には、サブエージェントの分も含まれます。

</details>

### Q4. サブエージェントが受け取るものをすべて選んでください(fork ではない場合)。
<!-- kind: multiple; skills: claude-agent-sdk -->

- A. 自分の system と、呼び出すときのプロンプト
- B. プロジェクトの CLAUDE.md
- C. 親の会話の履歴とツールの結果
- D. 親の system

<details>
<summary>解答</summary>

**A, B** — 親の会話や system は受け取らないので、要る情報は呼び出すときのプロンプトに書きます。

</details>

### Q5. 前に分析したセッションの続きから修正を頼みたいです。適切な方法はどれですか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. ResultMessage の session_id を控えておき、resume に渡す
- B. 新しく query を呼び、同じプロンプトを送る
- C. maxTurns を 0 にする

<details>
<summary>解答</summary>

**A** — 新しく query を呼ぶと、前の会話を持たずに始まります。元を残して別のやり方を試すなら fork を使います。

</details>

### Q6. 注文調査のセッション X が `error_max_turns` で終了しました。同じフォルダーで後から請求調査 Y が完了しています。X の記録は保存済みで、続行の予算もあります。注文担当に返す処理を選んでください。
<!-- kind: single; skills: claude-agent-sdk -->

- A. 最後に使ったツールの出力を最終回答として表示する
- B. 中断を記録し、残りの作業に合うターン数を設定して X の ID で再開する
- C. 回数の上限を増やし、`continue: true` で直近のセッションから続ける
- D. X の `result` を Y の最終回答の後ろに付けて担当に返す

<details>
<summary>解答</summary>

**B** — ツールが値を返しても、回数上限で止まった X には最終回答がありません。直近のセッションを再開すると請求調査 Y が選ばれます。請求調査の回答を流用すると、注文担当に別件の情報を渡してしまいます。

</details>

### Q7. 出荷ツールの記録に「未承認」「実行成功」が順に残りました。未承認の荷物を出荷する関数が呼ばれないことを確かめる変更はどれですか？
<!-- kind: single; skills: claude-agent-sdk -->

- A. 完了後のフックで承認を調べ、未承認が含まれるログを保存する
- B. 指示に承認が必要と明記し、返答が「確認しました」を含むか検査する
- C. 実行前のフックと実行側で承認を照合し、未承認ケースで出荷関数の呼び出しが 0 回と検査する

<details>
<summary>解答</summary>

**C** — この要件は、副作用を起こす処理より前に条件を強制して初めて満たせます。完了後のログは事後の調査に使えます。「確認しました」という回答文から、未承認の出荷を止めたかは判断できません。

</details>
