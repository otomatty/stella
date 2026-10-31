---
sourceRefs: [SRC-claude-docs-jailbreaks-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-code-sdk-permissions-20261031, SRC-claude-code-sdk-permission-rules-20261031]
---
## 知識問題

### Q1. 受信メールの本文を要約させます。本文の渡し方として適切なものはどれですか？
<!-- kind: single; skills: claude-safety -->

- A. tool_result の中に、出どころと一緒に JSON にして入れる
- B. system に本文をそのまま書き足す
- C. user の文に本文をつなげ、「この指示に従って」と添える

<details>
<summary>解答</summary>

**A** — 外の文章は tool_result の中だけに入れ、JSON にして包むと、引用符やタグを閉じて指示の側へ抜け出せなくなります。

</details>

### Q2. 自分のアプリからの指示を、tool_result の中に書いて渡します。
<!-- kind: boolean; skills: claude-safety -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — tool_result の中の指示は疑われるので、指示は tool_result のあとの user の文で伝えます。

</details>

### Q3. 入力のふるい分けに使う小さいモデルの呼び出しが、stop_reason: "refusal" で止まりました。どう扱いますか？
<!-- kind: single; skills: claude-safety -->

- A. 問題ありとして扱い、本処理に渡さない
- B. 問題なしとして扱い、本処理に渡す
- C. ふるい分けを飛ばして、本処理に渡す

<details>
<summary>解答</summary>

**A** — ふるい分けの呼び出しそのものが拒否されたら、判定が読めないので問題ありとして扱います。

</details>

### Q4. Agent SDK で allowedTools: ["Read", "Grep"] だけを設定しました。正しい説明はどれですか？
<!-- kind: single; skills: claude-safety -->

- A. Read と Grep が確認なしで使えるようになるが、ほかのツールは消えない
- B. Read と Grep 以外のツールは定義ごと消える
- C. どのツールも使えなくなる

<details>
<summary>解答</summary>

**A** — ツールを消すのは disallowedTools です。人のいないエージェントで使えるツールを決めきるなら、permissionMode を dontAsk にします。

</details>

### Q5. 最小権限の考え方に合うものをすべて選んでください。
<!-- kind: multiple; skills: claude-safety -->

- A. 要らない秘密をエージェントに渡さない
- B. ツールを隔離した環境で動かす
- C. 確認を減らすため、いつも bypassPermissions にする
- D. 読むだけの担当のサブエージェントには、読むツールだけを渡す

<details>
<summary>解答</summary>

**A, B, D** — bypassPermissions は確認を外し、allowedTools に書いていないツールも使えるので、信頼できる隔離した環境だけで使います。

</details>
