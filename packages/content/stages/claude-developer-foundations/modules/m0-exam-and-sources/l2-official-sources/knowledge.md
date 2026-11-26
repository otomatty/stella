---
sourceRefs: [SRC-claude-four-certs-20261031, SRC-claude-docs-features-20261031, SRC-claude-docs-messages-20261031, SRC-claude-code-agent-sdk-overview-20261031, SRC-claude-developer-guide-v11-20261118, SRC-claude-docs-batch-usage-20261031, SRC-anthropic-agent-evals-20261118, SRC-claude-developer-guide-v11-ja-20261126]
---
## 知識問題

### Q1. 入口診断で、バッチの結果が届いた順に依頼と結び付け、別の人の画面に金額を表示してしまいました。モデル選択と採点器の判定は理由まで説明できました。追加の30分に何をしますか？
<!-- kind: single; skills: claude-cert-exam-plan -->

- A. アプリへの組み込み（20%）の M2 に戻り、逆順の結果でも依頼 ID と正しく対応付けられるか試す
- B. モデル選択（12%）の M3 に戻り、すでに説明できた候補の費用をもう一度計算する
- C. 評価・テスト・デバッグ（10%）の M8 に戻り、採点器の一致率をもう一度求める

<details>
<summary>解答</summary>

**A** — 取り違えたのは、結果を元の依頼に戻す処理です。返却順を逆にした入力で custom_id を照合すれば、直ったことを確かめられます。費用や採点器を再計算しても、この誤りは検出できません。

</details>

### Q2. 次の診断で、配点20%の組み込みは全問正解でした。一方、配点10%の評価・デバッグでは、人と採点器の合格件数が同じなら合格した回答も同じと判断しました。次週の計画をどう調整しますか？
<!-- kind: single; skills: claude-cert-exam-plan -->

- A. 組み込みの配点が最大なので、追加練習はすべて組み込みに充てる
- B. 組み込みの復習は予定に残し、M8 で回答 ID ごとに人と採点器の不一致を探す時間を加える
- C. 領域ごとの配点と今回の誤答はいったん外し、8領域を同じ時間ずつ読み直す

<details>
<summary>解答</summary>

**B** — 配点は時間配分の目安です。今回の誤りは、合格件数が一致しても誤合格が残ることを見落とした点です。回答ごとに照合し、誤って通した ID を挙げられれば、練習した箇所の改善を確認できます。

</details>

### Q3. Agent SDK の仕様を確かめるドキュメントはどれですか？
<!-- kind: single; skills: claude-official-sources -->

- A. Claude Code のドキュメント
- B. Claude Developer Platform の料金のページ
- C. 試験ガイドのサンプル問題

<details>
<summary>解答</summary>

**A** — Agent SDK は Claude Code と同じ道具やループを使えるようにしたもので、仕様は Claude Code のドキュメントにあります。

</details>

### Q4. 記事で知った API の使い方は、公式ドキュメントの該当ページで確かめてから使います。
<!-- kind: boolean; skills: claude-official-sources -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — API には新しい機能が次々に足されるので、記事の説明がいまの仕様と違うことがあります。

</details>

### Q5. 学習の根拠に使えるものをすべて選んでください。
<!-- kind: multiple; skills: claude-official-sources -->

- A. 公式ドキュメントの該当ページ
- B. Partner Academy の準備の講座
- C. 本番の問題を写したとされる問題集

<details>
<summary>解答</summary>

**A, B** — 本番の問題を写したとされる問題集は、答えを確かめる方法がなく、受験の規約に反するおそれもあるので使いません。

</details>

### Q6. 自己評価で、Claude Code の操作は場面と理由を説明できました。同じ分野の「Claude Codeのカスタマイズと拡張」は、対応の候補は浮かぶものの、選ぶ理由を説明できません。学習計画にどう反映しますか？
<!-- kind: single; skills: claude-cert-exam-plan -->

- A. 操作を説明できたので、Claude Code の分野をすべて「説明できる」にする
- B. 分野の配点は 8% なので、配点の高い分野を先に読み、自己評価は時間配分に使わない
- C. カスタマイズと拡張を「あいまい」にして、場面に合う拡張の選び方を練習する時間を取る

<details>
<summary>解答</summary>

**C** — スキルごとに、対応の理由まで言えるかを確かめます。配点で決めた時間をもとに、理由があいまいだったスキルを練習する時間を取ります。

</details>
