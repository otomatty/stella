---
sourceRefs: [SRC-claude-docs-hallucinations-20261031, SRC-claude-docs-hallucination-advanced-20261031, SRC-claude-code-sdk-secure-deployment-20261031, SRC-claude-docs-jailbreaks-20261031]
---
## 知識問題

### Q1. 資料にない数字を、Claude がそれらしく答えてしまいます。最初に試す対策として適切なものはどれですか？
<!-- kind: single; skills: claude-grounding -->

- A. 分からないときは分からないと答えてよい、と指示に書く
- B. max_tokens を小さくする
- C. effort を max にする

<details>
<summary>解答</summary>

**A** — 不確かだと認めてよいとはっきり許すと、誤った情報が大きく減ります。

</details>

### Q2. 長い契約書から事実を答えさせます。ハルシネーションを減らす方法として適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-grounding -->

- A. 先に関係する箇所を一字一句抜き出させ、その引用をもとに答えさせる
- B. 主張ごとに根拠の引用を示させ、見つからない主張は取り下げさせる
- C. 契約書に書かれていないことも、一般の知識で補わせる

<details>
<summary>解答</summary>

**A, B** — 渡した資料の情報だけを使わせるほうが、ハルシネーションは減ります。

</details>

### Q3. ハルシネーションを減らす方法を使えば、誤りはなくなります。
<!-- kind: boolean; skills: claude-grounding -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 大きく減りますが、なくなりはしません。大事な判断に使う情報は人が確かめます。

</details>

### Q4. エージェントに社内 API を使わせます。鍵の扱いとして勧められているものはどれですか？
<!-- kind: single; skills: claude-safety -->

- A. エージェントの外にあるプロキシで、リクエストに鍵を付け足す
- B. 鍵を system に書いておく
- C. 鍵をエージェントの環境に置き、エージェントに送らせる

<details>
<summary>解答</summary>

**A** — エージェントは鍵を見ずに済み、プロキシで宛先を絞り、リクエストを記録できます。

</details>
