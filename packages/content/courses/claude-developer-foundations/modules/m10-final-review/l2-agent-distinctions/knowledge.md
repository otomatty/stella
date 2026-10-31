---
sourceRefs: [SRC-claude-docs-mcp-connector-20261031, SRC-claude-code-sdk-mcp-20261031, SRC-anthropic-effective-agents-20261031, SRC-anthropic-effective-agents-defs-20261031]
---
## 知識問題

### Q1. npx のコマンドで手元に起動する MCP サーバーのツールを、自作のエージェントに使わせたいです。つなぎ方として適切なものはどれですか？
<!-- kind: single; skills: claude-mcp -->

- A. Messages API の MCP コネクターの mcp_servers に、起動のコマンドを書く
- B. Agent SDK の mcpServers に stdio のサーバーとして書き、使うツールを allowedTools で許可する
- C. サーバーのツールの説明を、system にそのまま貼る

<details>
<summary>解答</summary>

**B** — コマンドで起動するサーバーは stdio のサーバーです。MCP コネクターは HTTP で公開されたサーバーにしかつなげません。

</details>

### Q2. MCP コネクターの説明として正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-mcp -->

- A. MCP の仕様の機能のうち、使えるのはツールの呼び出しだけである
- B. HTTP で公開された MCP サーバーにつなげる
- C. 手元の stdio のサーバーにも、直接つなげる
- D. 使う前に、自分で MCP クライアントを作る必要がある

<details>
<summary>解答</summary>

**A, B** — MCP コネクターを使えば、自分で MCP クライアントを作らずに、Messages API から公開されたサーバーのツールを使えます。

</details>

### Q3. 依頼ごとに、調べる場所も直すファイルの数も変わる調査と修正の仕事があります。作りとして適切なものはどれですか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. 決まった 3 段のプロンプトの連鎖
- B. 入力の種類ごとのルーティング
- C. 手順を Claude に任せるエージェント

<details>
<summary>解答</summary>

**C** — 何をするかがやってみないと決まらない仕事は、手順を前もって書けないので、エージェントが向きます。

</details>

### Q4. エージェントで作るか迷ったときの考え方として、正しいものはどれですか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. エージェントは速さと費用を性能と引き換えにするので、単純な作りで足りるならエージェントにしない
- B. エージェントのほうが常に速くて安いので、迷ったらエージェントにする
- C. 手順が決まった仕事でも、ワークフローよりエージェントのほうが予測しやすい

<details>
<summary>解答</summary>

**A** — 手順が決まった仕事は、予測しやすいワークフローが向きます。まず単純な作りで試し、効果が確かめられたときだけ複雑にします。

</details>
