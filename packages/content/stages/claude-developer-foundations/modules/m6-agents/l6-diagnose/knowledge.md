---
sourceRefs: [SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-result-troubleshooting-20261126, SRC-claude-code-agent-loop-control-20261031, SRC-claude-docs-stop-reasons-20261031, SRC-claude-docs-server-tools-20261126, SRC-claude-docs-context-editing-20261126, SRC-claude-docs-manage-tool-context-20261126]
---
## 知識問題

### Q1. 倉庫と価格の照会が成功した直後に 400 が返りました。どこを直しますか？
<!-- kind: single; skills: claude-tool-use -->

| 発言・応答 | 内容 |
| --- | --- |
| assistant | `tool_use(a)`、`tool_use(b)` |
| user | `tool_result(a)`、続けて説明のテキスト |
| API | 400。b の結果が必要 |

- A. API が受け取るまで同じリクエストを再試行する
- B. a の発言はそのまま送り、別の user の発言に b の結果を足す
- C. 直後の一つの user の発言に a と b の結果を並べ、そのあとに説明を置く

<details>
<summary>解答</summary>

**C** — 呼び出し全件の結果を、直後の一つの発言にまとめます。テキストは結果ブロックのあとに置きます。

</details>

### Q2. 集計結果が得られたあとも Messages API の呼び出しが続きます。どの分岐を直しますか？
<!-- kind: single; skills: claude-stop-reason -->

| 順番 | 記録 |
| --- | --- |
| 1 | assistant `tool_use(stock)` |
| 2 | user `tool_result(stock)` |
| 3 | assistant `end_turn`、集計結果あり |
| 4 | アプリが次のリクエストを送る |

- A. end_turn で結果を受け取り、クライアントツールのループを抜ける
- B. max_tokens を小さくして、ループが続いた場合の出力を減らす
- C. ツールの説明に「集計結果を書いたら終える」と足し、アプリの分岐はそのままにする

<details>
<summary>解答</summary>

**A** — ステップ 3 で Claude のターンは終了しています。追加のリクエストを送っているのはアプリなので、終了の分岐を直します。

</details>

### Q3. 同じ品番の照会が何度も続きます。何を変えますか？
<!-- kind: single; skills: claude-tool-use -->

| 順番 | 記録 |
| --- | --- |
| 1 | `tool_use`、入力は品番 P-12 |
| 2 | `is_error: true`、品番は廃番 |
| 3 | `tool_use`、入力は再び P-12 |
| 4 | `is_error: true`、同じ理由 |

- A. 待ち時間を長くし、同じ入力が通るまで再試行する
- B. この入力での照会を打ち切り、品番の確認を求める。一時的な失敗にも再試行上限を決める
- C. 次の依頼に「早く答える」と足し、呼び出し回数の扱いはそのままにする

<details>
<summary>解答</summary>

**B** — 廃番の品番は待っても有効になりません。入力を確認する経路を作り、再試行する場合も上限で止めます。

</details>

### Q4. 規程を検索するアプリで、回答のないまま完了と表示されました。どう続けますか？
<!-- kind: single; skills: claude-stop-reason -->

| 発言 | 内容 |
| --- | --- |
| user | 対象の規程から適用条件を調べて |
| assistant | `server_tool_use` を含む応答、停止理由は `pause_turn` |
| アプリ | 完了と表示 |

- A. assistant のテキストだけを履歴に残し、user の発言で「続きを」と頼む
- B. アプリでサーバーツールを実行し、結果を user の発言で返す
- C. assistant の内容を変えずに履歴に足し、同じ tools で新しい user の発言を加えずに送る

<details>
<summary>解答</summary>

**C** — pause_turn ではサーバー側の処理の途中です。応答のブロックとツール定義を保って、同じターンの続きを受け取ります。

</details>

### Q5. 続きを要求すると何度も一時停止します。この実行に何を足しますか？
<!-- kind: single; skills: claude-stop-reason -->

| リクエスト | 停止理由 |
| --- | --- |
| 初回 | `pause_turn` |
| 続行 1 | `pause_turn` |
| 続行 2 | `pause_turn` |

- A. 続行の上限を数える。上限内では各回の assistant の内容を順に残し、到達時は中断と記録する
- B. 前の assistant の内容を毎回消し、いちばん新しい応答だけで続ける
- C. 続行を重ねるたびに tools を一つ減らし、停止が起きなくなるまで送る

<details>
<summary>解答</summary>

**A** — 続行にも上限を置けば、同じ理由が返り続けても打ち切れます。続行の履歴には、各回の応答が必要です。

</details>

### Q6. 初めの照合条件を終盤で見落とすようになりました。どこを直しますか？
<!-- kind: single; skills: claude-context-management -->

| 時点 | 記録 |
| --- | --- |
| 依頼 | 規程 v3 で照合するよう指定 |
| 照合 1〜20 | ツールが毎回検索候補の全文を返す |
| 照合 21 | 検索候補が履歴の大半を占め、別の版で判定 |

- A. もっと大きい枠のモデルに替え、これまでの候補をそのまま送る
- B. ツール結果を判定に要る項目に絞り、照合済みの古い候補をコンテキストの編集で外す
- C. 同じ条件を system に繰り返し書き、ツールは候補の全文を返し続ける

<details>
<summary>解答</summary>

**B** — 記録では、使い終わった候補が文脈を占めています。判定に要る項目を残して、増えている結果を減らします。

</details>
