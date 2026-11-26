---
sourceRefs: [SRC-claude-docs-stop-vs-errors-20261031, SRC-claude-docs-stop-reasons-20261031, SRC-claude-docs-refusal-manual-retry-20261126, SRC-claude-docs-prompt-tool-usage-20261126, SRC-claude-docs-compaction-on-demand-20261126, SRC-claude-docs-structured-outputs-20261031, SRC-anthropic-agent-evals-20261118]
---
## 知識問題

### Q1. 配送案内が空欄になりました。記録は HTTP 200 と stop_reason: refusal です。5xx の警報は鳴っていません。アプリではどう扱いますか？
<!-- kind: single; skills: claude-stop-reason -->

- A. 一時的な通信障害として何度か同じモデルに送り直す
- B. 拒否として別に数え、途中の出力は捨てる
- C. 出力が途中で切れたとみなし、max_tokens を上げる

<details>
<summary>解答</summary>

**B** — HTTP は成功しています。refusal を独立して数えると、5xx の監視から漏れた拒否を把握できます。

</details>

### Q2. 編集ツールは使用できます。「手順書の修正案を出せますか」と依頼したら案だけが返りました。実際の変更が必要な場合はどこを直しますか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 返答に含める修正案の数を減らす
- B. 全作業向けに、正確に答えるという注意を足す
- C. 依頼に、対象ファイルと変更する箇所を明記して編集を求める

<details>
<summary>解答</summary>

**C** — 元の依頼は案を求めています。実行対象と操作を指定すれば、編集までを依頼できます。

</details>

### Q3. 会話を圧縮したあとにだけ、途中で伝えた締切が消えます。記録を比較すると、アプリは圧縮結果のブロックを次のリクエストに入れていません。どこを直しますか？
<!-- kind: single; skills: claude-context-management -->

- A. ハーネスの履歴の組み立てを直し、返ったブロックを履歴の先頭に置く
- B. max_tokens を上げ、前の条件も回答に含めるよう促す
- C. 圧縮の前に、重要なことを忘れないようプロンプトに追記する

<details>
<summary>解答</summary>

**A** — 次のリクエストに圧縮結果が届いていません。履歴にそのブロックを引き継ぐ処理を直します。

</details>

### Q4. 配送番号と状態を集計します。応答の一部は項目名を変えたり前置きを加えたりします。集計処理が期待する形で受け取るにはどうしますか？
<!-- kind: single; skills: claude-structured-output -->

- A. 出力形式の指示を最後にもう一度書く
- B. 必要な項目名と型をスキーマで指定し、構造化出力を使う
- C. 読み取れなかった応答を再送し、結果が読めたものだけを集計する

<details>
<summary>解答</summary>

**B** — スキーマで、集計処理が読む項目名と型を生成時に指定できます。

</details>

### Q5. ツールの実行後に中身が空の end_turn が返ります。記録には tool_result の直後にアプリが足した説明文がありました。まずどこを直しますか？
<!-- kind: single; skills: claude-stop-reason -->

- A. max_tokens を増やして答えに使える量を確保する
- B. ツールを外し、書ける範囲の案内だけを返す
- C. メッセージの組み立てを直し、ツール結果の直後に説明文を付ける処理を外す

<details>
<summary>解答</summary>

**C** — 空の end_turn が返る直前の履歴に原因があります。結果を渡すメッセージの形を直します。

</details>

### Q6. 評価では配送情報の保存が合格ですが、対象の行がデータベースにありません。採点器は返答に「保存しました」があると合格にします。どこから直しますか？
<!-- kind: single; skills: claude-evals -->

- A. 採点器が対象の行の有無を調べるようにして、同じ評価を回す
- B. 合格率が安定するまで回数を増やし、平均を記録する
- C. 保存が済んだら正確に報告するよう生成側の指示を強める

<details>
<summary>解答</summary>

**A** — 今の採点器は保存されていない実行も通します。実際の状態を採点に使うと、保存の失敗を検出できます。

</details>
