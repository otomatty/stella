---
sourceRefs: [SRC-anthropic-effective-agents-20261031, SRC-claude-docs-cost-intelligence-20261031]
---
## 知識問題

### Q1. 構成を作り、構成が条件を満たすかをコードで確かめてから本文を書きます。どの形ですか？
<!-- kind: single; skills: claude-workflows -->

- A. プロンプトの連鎖(段の間にゲートを置く)
- B. 投票
- C. 指揮役と作業役

<details>
<summary>解答</summary>

**A** — 前の段の出力を次の段の入力にし、ゲートで条件を満たさなければ先へ進みません。

</details>

### Q2. 簡単な質問は小さいモデル、難しい質問は強いモデルへ回します。どの形ですか？
<!-- kind: single; skills: claude-workflows -->

- A. ルーティング
- B. 評価役と生成役
- C. プロンプトの連鎖

<details>
<summary>解答</summary>

**A** — 最初に入力を分類し、種類ごとの処理へ回します。分類を正確にできることが条件です。

</details>

### Q3. コードの脆弱性を、違うプロンプトで 3 回確かめ、どれかが見つけたら知らせます。どの形ですか？
<!-- kind: single; skills: claude-workflows -->

- A. 並列化の投票
- B. 並列化の分割
- C. ルーティング

<details>
<summary>解答</summary>

**A** — 同じ仕事を何回か行って結果を比べるのが投票です。分割は、独立した別々の部分を同時に処理します。

</details>

### Q4. 指揮役と作業役が、並列化と違う点はどれですか？
<!-- kind: single; skills: claude-workflows -->

- A. 仕事の分け方を、入力に応じて指揮役がその場で決める
- B. 呼び出しを同時に走らせない
- C. Claude を使わない

<details>
<summary>解答</summary>

**A** — 並列化は分け方を前もってコードで決めておきます。

</details>

### Q5. 評価役と生成役の形が向く仕事の目安をすべて選んでください。
<!-- kind: multiple; skills: claude-workflows -->

- A. 人が指摘すると、答えがはっきり良くなる
- B. 同じような指摘を、Claude も出せる
- C. 評価の基準がはっきりしない

<details>
<summary>解答</summary>

**A, B** — 基準がはっきりしないと、繰り返しても良くなりません。

</details>
