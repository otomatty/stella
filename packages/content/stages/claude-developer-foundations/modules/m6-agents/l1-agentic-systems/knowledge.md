---
sourceRefs: [SRC-anthropic-effective-agents-defs-20261031, SRC-anthropic-effective-agents-20261031, SRC-claude-managed-agents-20261118, SRC-claude-code-agent-sdk-overview-20261031, SRC-claude-developer-guide-v11-20261118]
---
## 知識問題

### Q1. ワークフローとエージェントの違いとして正しいものはどれですか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. ワークフローは手順をコードで決め、エージェントは手順を Claude が決める
- B. ワークフローはツールを使えず、エージェントだけがツールを使える
- C. ワークフローは Claude を使わない

<details>
<summary>解答</summary>

**A** — どちらもツールを使えます。違いは、手順を決めるのがコードか Claude かです。

</details>

### Q2. 次のうち、エージェントが向く仕事はどれですか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. 依頼の内容によって、直すファイルの数も順番も変わるコードの修正
- B. 毎回同じ 3 段の手順で行う、記事の要約と翻訳
- C. 決まった 5 つの分類に分けるだけの問い合わせの整理

<details>
<summary>解答</summary>

**A** — 必要な手順の数を前もって決められない仕事は、エージェントに向きます。B と C は手順が決まっています。

</details>

### Q3. 新しく Claude を使った仕組みを作ります。最初に試すものとして適切なものはどれですか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. 資料と例を入れた 1 回の呼び出しを、評価のセットで確かめながら磨く
- B. 複数のエージェントを組み合わせた仕組みを作る
- C. フレームワークを選び、中の動きは気にせずに使う

<details>
<summary>解答</summary>

**A** — 単純な作りで足りないと確かめられたときだけ、ワークフローやエージェントへ進みます。

</details>

### Q4. エージェントを使うときの注意として正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-agentic-choice -->

- A. 費用がかかり、間違いが積み重なるおそれがある
- B. 隔離した環境で十分に試し、歯止めを用意する
- C. ツールとその説明をていねいに作る
- D. 手順が決まっているほど、エージェントのほうが向く

<details>
<summary>解答</summary>

**A, B, C** — 手順が決まった仕事には、動きを予想しやすいワークフローが向きます。

</details>

### Q5. 各案件で調べるファイルが変わり、処理が 30 分続く場合があります。既定のエージェントループで足り、実行ホストを運用する人はいません。Web アプリから開始して後で進捗を読む設計にはどれが合いますか？
<!-- kind: single; skills: claude-agentic-choice -->

- A. 利用者のブラウザーでループを動かし、閉じる直前に結果を記録する
- B. Managed Agents の環境とセッションを用意し、アプリからセッションのイベントを読む
- C. 自社サーバーに Agent SDK を置き、各リクエストの間だけループを動かす

<details>
<summary>解答</summary>

**B** — 実行とその記録をサービスに持たせるため、ブラウザーが閉じても案件を追えます。ブラウザーで動くループは画面を閉じると止まります。自社サーバーで SDK を動かすなら、実行ホストと長い処理を維持する仕組みを自社で運用します。

</details>
