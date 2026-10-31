---
sourceRefs: [SRC-claude-docs-structured-outputs-20261031, SRC-claude-docs-structured-considerations-20261031, SRC-claude-docs-prompting-20261031]
---
## 知識問題

### Q1. 構造化出力で JSON スキーマを渡す場所はどれですか？
<!-- kind: single; skills: claude-structured-output -->

- A. output_config.format
- B. system
- C. stop_sequences

<details>
<summary>解答</summary>

**A** — type に json_schema、schema にスキーマを書きます。JSON は応答の text ブロックに入って返ります。

</details>

### Q2. 構造化出力のスキーマに書くと 400 エラーになるものをすべて選んでください。
<!-- kind: multiple; skills: claude-structured-output -->

- A. 数の範囲(minimum・maximum)
- B. 文字数の制限(minLength・maxLength)
- C. enum
- D. required

<details>
<summary>解答</summary>

**A, B** — 書けない制限は、受け取ったあとにアプリで確かめます。

</details>

### Q3. 構造化出力を使えば、どの応答もそのまま JSON として読めます。
<!-- kind: boolean; skills: claude-structured-output -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — stop_reason が refusal や max_tokens の応答は、スキーマどおりとは限りません。先に stop_reason を確かめます。

</details>

### Q4. 最近のモデルで、応答の形を決めるために最後の assistant の発言を先に入れて(prefill)送ると、どうなりますか？
<!-- kind: single; skills: claude-structured-output -->

- A. 400 エラーになる
- B. その続きから答える
- C. 無視される

<details>
<summary>解答</summary>

**A** — Claude 4.6 以降のモデルでは使えません。形を決めたいときは構造化出力を使います。

</details>

### Q5. 箇条書きの少ない文章で答えてほしいです。より効く指示はどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 段落がなめらかにつながる文章で書いてください
- B. マークダウンを使わないでください
- C. 箇条書きは禁止です

<details>
<summary>解答</summary>

**A** — 禁止ではなく、してほしい形で指示します。

</details>
