---
sourceRefs: [SRC-claude-four-certs-20261031, SRC-claude-docs-features-20261031, SRC-claude-docs-messages-20261031, SRC-claude-code-agent-sdk-overview-20261031, SRC-claude-docs-stop-reasons-20261031, SRC-claude-docs-errors-20261031, SRC-claude-docs-streaming-20261031, SRC-claude-docs-batch-20261031, SRC-claude-docs-choosing-model-20261031, SRC-claude-docs-prompt-caching-20261031, SRC-claude-docs-effort-20261031, SRC-claude-docs-prompting-20261031, SRC-claude-docs-context-windows-20261031, SRC-claude-docs-structured-outputs-20261031, SRC-anthropic-context-engineering-20261031, SRC-claude-docs-tool-use-20261031, SRC-claude-docs-define-tools-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-mcp-connector-20261031, SRC-anthropic-writing-tools-20261031, SRC-anthropic-effective-agents-20261031, SRC-claude-code-agent-loop-20261031, SRC-claude-code-sdk-subagents-20261031, SRC-claude-docs-jailbreaks-20261031, SRC-claude-docs-hallucinations-20261031, SRC-claude-code-sdk-permissions-20261031, SRC-claude-code-memory-20261031, SRC-claude-code-hooks-guide-20261031, SRC-claude-docs-evals-20261031, SRC-claude-docs-tool-troubleshooting-20261031, SRC-claude-developer-guide-v11-20261118, SRC-claude-developer-prep-20261118]
---
# レッスン0-2 公式の情報源で学ぶ

## このレッスンの目標

- [ ] 出題の範囲と配点を確かめる資料を選べます。
- [ ] 調べたい機能に合う公式ドキュメントを開けます。
- [ ] 学習に使わない教材を見分けられます。

## 0-2-1 範囲は試験ガイドで確かめる

> **出題の範囲と配点は、Partner Academy の試験ガイドで確かめます。**

試験ガイドには、出題範囲と各領域からどの程度出題されるか（配点）が示されています。CCDV-F の「Exam Content Outline」で、各領域の配点と求められる判断を確かめます。

公式ガイドの配点を使って、各領域にかける時間の目安を出します。次に、下の診断で解けなかった領域に復習の時間を足します。Partner Academy の公式準備講座でも復習できます。たとえば、M5 でツールの接続に迷ったら「Claude Code, MCP & Integration」、M8 で採点の根拠を説明できなかったら「Production Engineering, Evals & Security」を開いてください。[Developer – Foundations の公式準備講座](https://anthropic-partners.skilljar.com/path/claude-certified-developer-foundations)

### 70問を120分で解く

Claude Certified Developer: Foundations の資格コードは **CCDV-F** です。本番では120分で70問を解きます。採点対象は60問で、残りの10問は試験中に見分けられません。本番の得点は100〜1,000の尺度で示され、720点が合格です。最後の模試ステージでは70問をすべて採点し、領域別の正答率で復習先を決めます。[公式試験ガイド（日本語）](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946795/Claude_Certified_Developer_-_Foundations_Exam_Guide_Updated_Dec_7_Japanese.pdf) ／ [公式試験ガイド（英語）](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946771/Claude_Certified_Developer_-_Foundations_Exam_Guide_Updated_Dec_7.pdf)

### 8領域をどこで練習するか

配点は、本番で採点される問題に各領域が占めるおおよその割合です。

| 領域 | 配点 | 弱かったときの練習先 |
| --- | ---: | --- |
| アプリへの組み込み | 20% | M1・M2。履歴から次のリクエストを作り、中断した応答の保存を防ぐ |
| エージェントとワークフロー | 17% | M6。失敗した段の記録から、次のツールを実行してよいか決める |
| プロンプトとコンテキスト | 15% | M4。資料に答えがない例と、壊れた出力の例を試す |
| モデル選択と最適化 | 12% | M3。同じ入力で品質・時間・費用を測り、条件に合う候補を選ぶ |
| 評価・テスト・デバッグ | 10% | M8。採点器が誤って通した回答を特定する |
| ツールと MCP | 10% | M5。品目表の読み取りと在庫検索を別々に実装して確かめる |
| Claude Code | 8% | M8。個人だけの設定と、チームに配る手順を区別する |
| セキュリティと安全性 | 8% | M7。権限のないツールを呼ぼうとした時点で止める |

基礎ステージでは、表の練習先で手を動かします。次の実践一問一答ステージでは、一つの場面について自分で判断してから解説で確かめます。最後の模試ステージ用に、連続した120分を確保してください。

### 入口の10分診断

次の記録を読み、最初に調べる場所と、その理由を一文ずつメモします。分からないものには印を付けます。

| 記録 | 何を確かめますか |
| --- | --- |
| A. 夜間の一括処理で、受付順は17、18、返却順は18、17。両方とも成功なのに顧客17の画面に18の結果が出た | 受信側のどの値を手がかりに直しますか |
| B. 同じテストで候補甲は正解98/100・2.4秒、候補乙は96/100・1.6秒。要件は95件以上の正解かつ2秒以内 | 採用する候補はどちらですか。正解の要件が97件に上がったらどうしますか |
| C. 人も採点器も20件のうち18件を合格にした。人は例4を不合格、採点器は合格にした | 合格件数が一致していても、どんな誤りを通しますか |

**答え合わせ**　A は送信時に付けた `custom_id` で結果と元データを結びます（M2）。B は乙だけが両方を満たします。97件なら両方を満たす候補はなく、変更して再評価します（M3）。C は例4の誤合格です。どの回答を通したかを同じ ID で照合します（M8）。

計画には「弱かった領域」「やり直す課題」「できたと判断する証拠」を1行ずつ書きます。たとえば A なら「結果の順番を逆にしたテストでも、顧客と結果が一致する」です。最後の模試を受けたあと、同じメモに新しく見つけた誤りを追記します。

## 0-2-2 API の仕様は公式ドキュメントで確かめる

> **API の動きは、公式ドキュメントの該当ページで確かめます。**

公式ドキュメントは、Anthropic が公開している仕様の説明です。API には新しい機能が次々に足されるので、記事の説明がいまの仕様と違うことがあります。試験はいまの仕様で正しい作り方を問うので、記事で知ったことも公式ドキュメントで確かめます。

入口は Claude Developer Platform のドキュメントです。Features overview で使える機能の名前と置き場所をつかみ、Messages API(Claude にメッセージを送って応答を受け取る API)の基本は Using the Messages API で確かめます。該当ページは見出しまで開き、条件と制限を自分の言葉で書き出します。

## 0-2-3 Agent SDK の仕様は Claude Code のドキュメントにある

> **Agent SDK の仕様は、Claude Code のドキュメントで確かめます。**

Agent SDK は、エージェントを作るためのライブラリーです。Claude Code を動かしているのと同じ道具やループを、自分のアプリで使えるようにしたものです。そのため Agent SDK の仕様は、Claude Developer Platform ではなく Claude Code のドキュメントにあります。

Messages API・ツール使用・プロンプトは Claude Developer Platform、Claude Code と Agent SDK は Claude Code のドキュメントで確かめます。

## 0-2-4 本番の問題を写した教材は使わない

> **本番の問題を写したとされる問題集は、学習に使いません。**

本番の問題を集めたとうたう問題集や学習ガイドがあります。人気のある学習ガイドでも、問題を「実際の試験の資料から取った」と書いているものがあります。こうした非公式の問題集(Anthropic 以外が作った問題集)は使いません。答えが正しいかを確かめる方法がなく、受験の規約に反するおそれもあるためです。答えを覚えるだけでは、場面ごとに作り方を選ぶ力も身につきません。

代わりに、試験ガイドとその中のサンプル問題、Partner Academy の準備の講座、公式ドキュメントを使います。このステージの知識問題は、すべて教材のために作ったものです。受験の規約は、申し込むときに必ず読みます。

## もっと知りたい人へ

### 公式の情報源マップ

このステージで根拠にする公式のページです(どれも英語)。見出しはこのステージの区分で、試験ガイドの範囲の名前ではありません。試験ガイドの範囲と見比べて、弱い範囲のページから読みます。

#### Messages API とアプリへの組み込み

- [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) — リクエストと応答の基本、続けてやり取りするときの送り方
- [Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) — 応答が止まった理由の値と、値ごとの扱い方
- [Claude API errors](https://platform.claude.com/docs/en/api/errors) — HTTP のエラーの種類、SDK のエラーの型、request ID
- [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) — 応答を少しずつ受け取る方法と、届くイベントの種類
- [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) — 大量のリクエストをまとめて処理する Message Batches API と料金

#### モデルと費用

- [Choosing the right model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model) — 選ぶ基準の決め方と、モデルの組み合わせ方
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — プロンプトの前半を使い回す仕組みと料金
- [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) — 応答にかけるトークンの量を調整する設定

#### プロンプトとコンテキスト

- [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — 指示の書き方の原則と、出力の形の指定
- [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) — コンテキストウィンドウの仕組みと、圧縮による管理
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — スキーマに合う JSON を返させる仕組み
- [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) — エージェントに渡す情報の組み立て方(記事)

#### ツールと MCP

- [Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) — ツール使用の流れと、ツールの選び方
- [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) — 自分のツールの定義の書き方
- [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) — ツールの呼び出しを受けて、結果を返す方法
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) — Messages API からリモートの MCP サーバーにつなぐ機能と、その制限
- [Writing effective tools for agents — with agents](https://www.anthropic.com/research/writing-tools-for-agents) — エージェント向けのツールを書く原則(記事)

#### エージェント

- [Building effective agents](https://www.anthropic.com/research/building-effective-agents) — エージェントを使う場面と、ワークフローの型(記事)
- [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) — Agent SDK でできることと、ほかの道具との比べ方
- [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop) — エージェントのループと、ツールの実行
- [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents) — サブエージェントを使う利点と、引き継ぐもの

#### 安全性

- [Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks) — 直接・間接のプロンプトインジェクションへの対策
- [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) — 事実でない出力を減らす基本の方法
- [Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions) — Agent SDK の許可の判定の順番と、許可のモード

#### Claude Code

- [How Claude remembers your project](https://code.claude.com/docs/en/memory) — CLAUDE.md と自動のメモリーの違い
- [Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide) — hooks で自動にできることと、その仕組み

#### 評価とデバッグ

- [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) — 成功の基準の決め方と、評価の作り方
- [Troubleshooting tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/troubleshooting-tool-use) — ツールを選び違えるとき、ない引数を作るときの直し方

### 試験の制度

- [Four role-based certifications for the people who put Claude to work for customers](https://claude.com/resources/articles/four-role-based-claude-certifications) — 準備の講座の置き場所と、試験の受け方(英語)

知識問題で、このレッスンの内容を確かめます。単元の課題「配点に合わせて学習時間を配る」は、課題一覧の「VS Code で開く」から取り組みます。
