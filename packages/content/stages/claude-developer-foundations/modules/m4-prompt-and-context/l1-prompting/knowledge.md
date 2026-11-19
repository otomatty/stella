---
sourceRefs: [SRC-claude-docs-prompting-20261031, SRC-anthropic-context-engineering-20261031, SRC-claude-docs-hallucinations-20261031, SRC-claude-developer-guide-v11-20261118]
---
## 知識問題

### Q1. 指示の書き方として、より効果があるとされるものはどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 返答は音声で読み上げるので、読み方の分からない「…」は使わないでください
- B. 絶対に「…」を使わないでください
- C. 「…」は禁止

<details>
<summary>解答</summary>

**A** — 理由を添えると、Claude は書かれていない場面にも広げて当てはめます。

</details>

### Q2. 出力の形を伝える例(few-shot)の選び方として適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-prompt-design -->

- A. 実際の用途に近い例にする
- B. 例外的な場合も含め、種類の違う例にする
- C. 例を example のタグで包み、指示と区別する
- D. 同じ形の例を 20 個並べる

<details>
<summary>解答</summary>

**A, B, C** — 似た例ばかりだと、意図しない癖まで真似します。公式ドキュメントは 3〜5 個を勧めています。

</details>

### Q3. 指示・資料・例が混ざったプロンプトを、取り違えにくくする方法はどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. それぞれを XML のタグで包む
- B. すべてを 1 つの段落にまとめる
- C. 指示を大文字で書く

<details>
<summary>解答</summary>

**A** — タグの名前は中身が分かるものにし、プロンプトの間でそろえます。

</details>

### Q4. 3 万トークンの契約書について質問します。並べ方として適切なものはどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 契約書を先頭に置き、質問を最後に書く
- B. 質問を先頭に書き、契約書をそのあとに置く
- C. 契約書を半分に分け、間に質問を書く

<details>
<summary>解答</summary>

**A** — 長い資料は先頭、質問は最後に置くと、答えの質が上がりやすいとされています。

</details>

### Q5. 長い資料から答えさせるときに、関係のない部分に引きずられにくくする方法はどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 先に関係する箇所を引用させ、その引用をもとに答えさせる
- B. 資料を省き、質問だけを送る
- C. max_tokens を小さくする

<details>
<summary>解答</summary>

**A** — 引用を quotes のようなタグに書かせてから答えさせます。

</details>

### Q6. 検索型の手順案内で、資料にない保管期限を答えてしまいました。指示を「根拠の条文を返し、見つからなければその旨を返す」に変えます。改訂の効果を比較できる試し方はどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 承認済みの条文で答えられる質問だけを増やし、引用の件数を比べる
- B. 改訂版だけ検索件数を増やし、回答できた質問の数を数える
- C. 同じ検索結果と質問を両版に渡し、根拠の一致と、根拠が無い場合に未確認と答えたかを照合する

<details>
<summary>解答</summary>

**C** — 資料と質問を固定すれば、指示を変えた影響を比べられます。条文で答えられる例だけでは、今回の失敗を再現できません。検索件数も変えると、改善があっても理由を切り分けられません。

</details>
