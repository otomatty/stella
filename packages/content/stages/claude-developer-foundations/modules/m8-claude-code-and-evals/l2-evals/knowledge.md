---
sourceRefs: [SRC-claude-docs-evals-20261031, SRC-claude-docs-eval-grading-20261031, SRC-claude-docs-tool-troubleshooting-20261031, SRC-anthropic-agent-evals-20261118]
---
## 知識問題

### Q1. 成功の基準の書き方として、最も適切なものはどれですか？
<!-- kind: single; skills: claude-evals -->

- A. 1 万回の出力のうち、内容のフィルターで問題ありと判定されるのが 0.1% 未満
- B. 安全な出力を返すこと
- C. 利用者に喜ばれること

<details>
<summary>解答</summary>

**A** — 具体的で測れる形にします。「安全」「喜ばれる」という言葉だけでは、どの出力で達成と判定するかが決まりません。

</details>

### Q2. 評価のセットの作り方として適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-evals -->

- A. 本番の入力に似せ、例外的な入力も入れる
- B. できるだけ自動で採点できる形にする
- C. 人が丁寧に採点できる 5 件だけにする

<details>
<summary>解答</summary>

**A, B** — 少し粗くても自動で採点できる多くの例のほうが、人が採点する少数よりよいとされています。

</details>

### Q3. 採点の方法のうち、最も速く確かで、数を増やせるものはどれですか？
<!-- kind: single; skills: claude-evals -->

- A. コードで採点する(完全一致・含むかどうか)
- B. 人が採点する
- C. LLM に、基準を決めずに感想を書かせる

<details>
<summary>解答</summary>

**A** — 細かな判断が要るときは、基準をはっきり書いた LLM による採点を使います。人の判定は、LLM の採点が妥当かを確かめる基準にも使います。

</details>

### Q4. プロンプトを直したあと、前と比べる方法として適切なものはどれですか？
<!-- kind: single; skills: claude-evals -->

- A. 前と同じ評価のセットで採点し、合格率と、前は通って後で落ちた例を確かめる
- B. 新しく作った例だけで試す
- C. 数件を目で見て、良くなったかを判断する

<details>
<summary>解答</summary>

**A** — 試す例が違うと比べられません。合格率が上がっていても、大事な例が落ちていることがあります。

</details>

### Q5. Claude が、スキーマにない項目をツールの入力に作ってしまいます。適切な直し方はどれですか？
<!-- kind: single; skills: claude-evals -->

- A. ツールの定義に strict: true を付ける
- B. ツールの名前を長くする
- C. max_tokens を小さくする

<details>
<summary>解答</summary>

**A** — strict にすると、入力が input_schema どおりになります。別のツールが呼ばれるときは、いつ使うかで説明を書き分けます。

</details>

### Q6. 人が落とした回答を採点器が通したので基準を修正しました。採用を決めるため、次に何を調べますか？
<!-- kind: single; skills: claude-evals -->

- A. 修正に使った回答がすべて合格になったか
- B. 未使用の回答を人と採点器がどう判定したか、特に人が落とした例を通していないか
- C. 人と採点器の合格件数が同数に戻ったか

<details>
<summary>解答</summary>

**B** — 基準を書き直した例は修正の確認に使います。採用判断では未使用の回答を ID で照合します。合格件数だけでは誤合格と誤不合格が相殺されます。

</details>
