---
sourceRefs: [SRC-claude-docs-choosing-model-20261031, SRC-claude-docs-choosing-start-20261031, SRC-claude-docs-effort-20261031, SRC-claude-docs-effort-set-20261031, SRC-claude-docs-cost-intelligence-20261031]
---
## 知識問題

### Q1. 毎日数万件の問い合わせを、決まった 5 つの分類に分けます。最初に試すモデルの選び方として適切なものはどれですか？
<!-- kind: single; skills: claude-model-selection -->

- A. 速くて安いモデルから始め、足りないところがあれば上のモデルに上げる
- B. いちばん性能の高いモデルを使い、そのまま本番に出す
- C. 料金表だけを見て、いちばん安いモデルに決める

<details>
<summary>解答</summary>

**A** — 量が多く単純な処理は、速度・費用から始める方法が向きます。C は、自分の課題で試していません。

</details>

### Q2. 候補のモデルを比べるときに、最も大切とされる手順はどれですか？
<!-- kind: single; skills: claude-model-selection -->

- A. 自分の用途に合わせた評価のセットを作る
- B. 一般の評判を集める
- C. 最新のモデルを選ぶ

<details>
<summary>解答</summary>

**A** — 実際のプロンプトとデータで、正しさ・質・例外的な入力の扱いを比べます。

</details>

### Q3. 費用は高いが、答えの質は足りています。最初に試すこととして適切なものはどれですか？
<!-- kind: single; skills: claude-model-selection -->

- A. 今のモデルのまま effort を下げ、評価のセットで質を確かめる
- B. 安いモデルと組み合わせる仕組みを作る
- C. max_tokens を小さくして、応答を途中で切る

<details>
<summary>解答</summary>

**A** — モデルを替えるより、effort の調整がよい手段になることが多いとされています。組み合わせは、effort を調整しても足りないときに考えます。

</details>

### Q4. effort の説明として正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-model-selection -->

- A. output_config.effort に書く
- B. 本文だけでなく、ツールの呼び出しや考える過程にも効く
- C. 指定したトークン数を超えないことが保証される
- D. 既定の値を書くと、省いたときと同じ動きになる

<details>
<summary>解答</summary>

**A, B, D** — effort は動きの目安で、厳密な上限ではありません。出力の上限を決めるのは max_tokens です。

</details>

### Q5. 強いモデルが計画を立てて作業を配り、安いモデルが大量の作業をする形はどれですか？
<!-- kind: single; skills: claude-model-selection -->

- A. オーケストレーター
- B. アドバイザー
- C. バッチ

<details>
<summary>解答</summary>

**A** — アドバイザーは逆に、安いモデルが進め、難しい判断のときだけ強いモデルに聞く形です。

</details>
