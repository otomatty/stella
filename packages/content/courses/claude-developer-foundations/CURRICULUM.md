# Claude Certified Developer 対策 カリキュラム

Anthropic の認定資格 **Claude Certified Developer: Foundations** の対策講座です。
Claude API でアプリを作るエンジニア向けの試験で、範囲は Claude API・ツール使用・エージェント開発が中心です。
11 単元・計 40 時間(1 日 2〜3 時間で約 4 週間)で試験の範囲を一巡し、自作の模擬試験と直前対策で仕上げます。
1 トピック = 覚えることが 1 つ(takeaway 1 文)の粒度で、機能名の暗記ではなく
「場面を読んで、公式ドキュメントで確かめた作り方を選べる」状態を目指します。

- Web(LMS): スライド視聴・まとめ・知識問題(合格点 80)。format 2 の講座で、知識問題は SRS の復習カードにもなる
- 手を動かす部分: 各単元に VS Code 拡張の課題(`node-test-01`、Vitest)を置く(下の「手を動かす課題」)。
  Claude API の応答はテストの中で偽のクライアントに差し替えるので、**API キーと有料の API 呼び出しは完走条件にしない**
- 置き場所: スキルツリーの **Anthropic認定資格** の島(表示条件は `dev-env-basics` のクリア)。
  旧 AI駆動開発の島(AI駆動開発の考え方・Claude チャット入門・Claude Code 入門・Skills とサブエージェント・
  検証・hooks・MCP・Cowork 入門の 6 講座)は 2026-10 に退役させ、この講座を一から作り直す
- 前提講座: **開発環境とWebの入口(`dev-env-basics`)**。Node.js と VS Code の拡張で課題を確かめられる状態から始める
  (`course.json` の `prerequisites` に対応)。Claude Code も、試験の範囲のぶんはこの講座で扱う(M8)
- 推奨(解放条件にはしない): JavaScript / TypeScript で関数と非同期の HTTP 通信が読めること
  (`javascript-basics`・`http-async-basics` の範囲)。試験の受験者像は Python か TypeScript が読み書きできる人とされる(要確認、下記)
- 問題はすべて自作です。公式のサンプル問題・非公式の問題集・本番の問題を写したとされる教材の転載はしません
- **合格を保証するものではありません**
- 対象外:
  - Associate: Foundations・Architect: Foundations・Architect: Professional の対策
  - Managed Agents・管理用 API(Admin API など)・クラウド各社経由の提供形態の詳しい手順
  - 有料の API 呼び出しや API キーを前提にした課題
  - 模擬試験専用の計時・採点の仕組み(模試の中身は M9 の知識問題として持つ)

## 教材要件シート

- 講座名 / slug: Claude Certified Developer 対策 / `claude-developer-foundations`
- 新講座 or 既存講座への追加: 新講座(Anthropic認定資格の島。前提は `dev-env-basics`)
- 対象者(受講直前の状態): 開発環境を整え、VS Code の拡張で課題を確かめられる。次は Claude API でアプリやエージェントを作る/
  Developer: Foundations を受験する予定の社内エンジニア。所属組織が Claude Partner Network に加盟していること(受験資格)
- 前提講座 / 前提知識: `dev-env-basics`(解放条件)。JavaScript / TypeScript の読解は推奨
- 到達目標: 下の「到達目標」
- スコープ外: 上の「対象外」
- 評価方法: 知識問題あり(各レッスン、合格点 80) / コード演習あり(各単元、`node-test-01`。下の「手を動かす課題」) / 模擬試験 = 知識問題(M9)
- 規模: 11 単元 / 29 レッスン / 78 トピック(M9・M10 の演習レッスンを除く)
- 出典: 公式ドキュメント(Claude Developer Platform・Claude Code)と Anthropic の記事。下の「公式の情報源」
- 参照元の台帳: `sources/registry.json`
- 使用箇所と表示: 単元の `references.json`、各トピック・まとめ・知識問題の `sourceRefs`
- 書く人 / 改訂する人: 講師(承認者)。試験ガイドの改訂(下記)ごとに範囲の対応を見直す

## 試験の前提(調査 2026-10-31)

**公式の試験ガイドは、Anthropic Partner Academy(ログインが必要)にあり、執筆環境から取得できていません。**
下の表の「確度」が ◎ 以外の項目は、受講開始時に試験ガイドと Partner Academy・Pearson のページで確かめてください。
講師が確かめるページ(ログインが必要なものを含む):

- 4 資格の一覧と、各資格の試験ガイド・準備講座・申し込み: https://anthropic-partners.skilljar.com/page/partner-certifications
- 試験の準備講座: https://anthropic-partners.skilljar.com/page/claude-certification-exam-prep-courses
- 受験資格: https://anthropic-partners.skilljar.com/page/certification-eligibility
- よくある質問: https://anthropic-partners.skilljar.com/page/faq-certifications
- Pearson の Anthropic のページ(出題の改訂の案内): https://www.pearsonvue.com/us/en/anthropic.html

執筆環境からは `anthropic-partners.skilljar.com`・`www.pearsonvue.com`・`modelcontextprotocol.io`・
`www.credly.com` に届かず、Pearson と Credly の記述は Web 検索の要約経由です。

| 項目 | 内容 | 確度 | 出典 |
| --- | --- | --- | --- |
| 対象者 | Claude でアプリを作るエンジニア。Claude API・ツール使用・エージェント開発の訓練を含む | ◎ | claude.com の発表(2026-07-23) |
| 受験資格 | Claude Partner Network の加盟組織の人。加盟は無料で、組織が受験者を登録する | ◎ | 同上 |
| 実施 | Pearson が監督つきで実施。受験前に本人確認。合格者は Credly のデジタルバッジ | ◎ | 同上 |
| 準備の講座 | 資格ごとの準備講座が Anthropic Partner Academy にある | ◎ | 同上 |
| 組織の人数 | 認定は個人に属する。有効な認定を持ち、直近 90 日に Claude を使った人を数える | ◎ | anthropic.com の Services Track(2026-06-03) |
| 形式 | 53 問・120 分・合格 720 / 1000(尺度点) | △ | 第三者の解説・受験記 |
| 受験料 | 125 USD | △ | 同上 |
| 言語 | 日本語でも受験できる | ○ | 講師の確認(2026-10-31)。それ以前の受験記には英語のみとある |
| 有効期間 | 12 か月 | △ | 第三者の解説 |
| 受験者像 | 開発の実務 1〜5 年、LLM の実務 6 か月以上、Python か TypeScript(推奨で必須ではない) | △ | 試験ガイドを引用した第三者の解説 |
| 組織の人数への算入 | Developer は算入される(Associate は算入されない) | △ | 第三者の解説 |
| **出題の改訂** | **2026-12-07 から出題が変わり、新しい試験ガイドは 2026-11-17 に出る** | ○ | Pearson のページ(検索の要約) |

### 改訂への備え

- 2026-12-07 以降に受験する受講者は、11-17 に出る新しい試験ガイドで準備します(Pearson の案内)
- この講座は**機能の単元(M1〜M8)を試験のドメイン名で切らず**、公式ドキュメントの区分で切っています。
  ドメインの名前・配点が変わっても、単元の本文は機能の仕様が変わらない限り直さずに済み、
  下の対応表と M0・M9・M10 を直せば追従できます
- 新しい試験ガイドが出たら: 講師がガイドを確認 → 下の対応表と単元の時間配分を更新 → M9 の模試の配分を直す →
  改訂した単元は `unitId` の版を上げ、参照元を確かめ直してから `contentHash` を更新する

### ドメインと配点(試験ガイド v1.0、2026-07。第三者の解説による)

| ドメイン | 配点 | 対応する単元 |
| --- | --- | --- |
| Applications and Integration | 33.1% | M1(Messages API)・M2(アプリへの組み込み) |
| Model Selection and Optimization | 16.8% | M3 |
| Agents and Workflows | 14.7% | M6 |
| Prompt and Context Engineering | 11.0% | M4 |
| Tools and MCPs | 10.6% | M5 |
| Security and Safety | 8.1% | M7 |
| Claude Code | 3.1% | M8 |
| Eval, Testing, and Debugging | 2.6% | M8 |

配点は講師が試験ガイドで確かめるまで、受講者向けの本文(スライド・まとめ・知識問題)に数字を書きません。
M0 は「試験ガイドの配点で時間を配る」ことだけを教え、数字はガイドを開いて確かめさせます。

## 公式の情報源(確認日 2026-10-31)

本文の根拠にする公式の資料です。「使う単元」に M0〜M2 があるものは `sources/registry.json` に登録済みで、
2026-10-31 に HTTP 200 と「読む節」の見出しがページにあることを、週次のリンク確認と同じ照合で確かめました。
M3 以降だけで使うものは、単元を書くときに登録します。「読む節」はページの見出しの表記です。

| 区分 | 資料 | 読む節 | 使う単元 |
| --- | --- | --- | --- |
| Messages API | [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) | Basic request and response / Multiple conversational turns | M0・M1 |
| | [Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) | Stop reason values / Best practices for handling stop reasons | M0・M1 |
| | [Claude API errors](https://platform.claude.com/docs/en/api/errors) | HTTP errors / SDK error types / Request ID | M0・M2 |
| | [Rate limits](https://platform.claude.com/docs/en/api/rate-limits) | About rate limits / Response headers | M2 |
| | [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) | Streaming with SDKs / Event types | M0・M2 |
| | [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) | How the Message Batches API works / Pricing | M0・M2 |
| | [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)(system の節) | System role in messages | M1 |
| | [Messages(API リファレンス)](https://platform.claude.com/docs/en/api/messages) | Create a Message | M1 |
| | [TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript) | Usage / Retries | M1 |
| | [Get your Claude API key](https://platform.claude.com/docs/en/get-api-key) | Use your API key | M1 |
| | [Model IDs and versioning](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions) | Model ID format / Dateless IDs are pinned snapshots | M1 |
| | [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) | What a refusal looks like | M1 |
| | [Claude API errors](https://platform.claude.com/docs/en/api/errors)(Long requests の節) | Long requests | M2 |
| | [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming)(差分と finalMessage の節) | Content block delta types / Get the final message without handling events | M2 |
| | [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)(使い方の節) | Prepare and create your batch / Retrieving batch results | M2 |
| | [Files API](https://platform.claude.com/docs/en/build-with-claude/files) | How the Files API works / How to use the Files API | M2 |
| | [Vision](https://platform.claude.com/docs/en/build-with-claude/vision) | Send images to Claude | M2 |
| | [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) | Process PDFs with Claude | M2 |
| | [Features overview](https://platform.claude.com/docs/en/build-with-claude/overview) | Platform features / Messages API features | M0 |
| モデルと費用 | [Choosing the right model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model) | Establish key criteria / Combine models | M0・M3 |
| | [Optimizing for cost and intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) | Cut spend without losing quality / Combine models | M3 |
| | [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | How prompt caching works / Pricing | M0・M3 |
| | [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) | How effort works / Recommended effort levels | M0・M3 |
| プロンプトとコンテキスト | [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) | General principles / Output and formatting | M0・M4 |
| | [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) | How the context window works / Manage context with compaction | M0・M4 |
| | [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) | Why use structured outputs / How it works | M0・M4 |
| | [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) | The anatomy of effective context / Context retrieval and agentic search | M0・M4 |
| ツールと MCP | [Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) | How tool use works / Choose a tool | M0・M5 |
| | [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) | Specifying client tools | M0・M5 |
| | [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) | Handling results from client tools / Handling results from server tools | M0・M5 |
| | [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) | Key features / Limitations | M0・M5 |
| | [Writing effective tools for agents — with agents](https://www.anthropic.com/research/writing-tools-for-agents) | Principles for writing effective tools | M0・M5 |
| | [Connect to external tools with MCP(Agent SDK)](https://code.claude.com/docs/en/agent-sdk/mcp) | Add an MCP server / Transport types | M5 |
| | MCP の仕様(modelcontextprotocol.io) | — | M5。**執筆環境から届かないため未確認** |
| エージェント | [Building effective agents](https://www.anthropic.com/research/building-effective-agents) | When (and when not) to use agents / Building blocks, workflows, and agents | M0・M6 |
| | [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) | Compare the Agent SDK to other Claude tools / Capabilities | M0・M6 |
| | [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop) | The loop at a glance / Tool execution | M0・M6 |
| | [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents) | Benefits of using subagents / What subagents inherit | M0・M6 |
| 安全性 | [Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks) | Jailbreaks and direct prompt injection / Indirect prompt injection | M0・M7 |
| | [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) | Basic hallucination minimization strategies | M0・M7 |
| | [Configure permissions(Agent SDK)](https://code.claude.com/docs/en/agent-sdk/permissions) | How permissions are evaluated / Permission modes | M0・M7 |
| Claude Code | [How Claude remembers your project](https://code.claude.com/docs/en/memory) | CLAUDE.md vs auto memory / CLAUDE.md files | M0・M8 |
| | [Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide) | What you can automate / How hooks work | M0・M8 |
| | [Settings files and precedence](https://code.claude.com/docs/en/settings) | Settings files and who they affect / Settings precedence | M8 |
| 評価とデバッグ | [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) | Define your success criteria / Build evaluations | M0・M8 |
| | [Troubleshooting tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/troubleshooting-tool-use) | Claude calls the wrong tool / Claude invents tool parameters | M0・M8 |
| 試験の制度 | [Four role-based certifications …](https://claude.com/resources/articles/four-role-based-claude-certifications)(2026-07-23) | The four credentials / How the exams work / How to find an exam or learn more about the Claude Partner Network | M0・M10 |
| | [Introducing the Services Track and Partner Hub …](https://www.anthropic.com/news/services-track-partner-hub)(2026-06-03) | About the Services Track | M0 |

- ドキュメントは更新型です。モデル名・料金・上限の数字は本文に持ち込まず、ページの見出しの範囲で考え方を書きます
- 準備の講座(Partner Academy)・試験ガイド・サンプル問題は受講者が自分のアカウントで開きます。教材に写しません
- 使わないもの: 本番の問題を写したとする教材(★の多い GitHub の学習ガイドにも、問題を「実際の試験の資料から」と書いたものがある)、
  有料の「問題集」サイト。受験記・第三者の解説は、出題の傾向をつかむ参考にとどめ、本文の根拠にしない

## 到達目標(観測可能)

1. 会話の履歴・system・max_tokens・stop_reason の役割を、リクエストと応答の例から **説明できる**
2. エラー(429・529 など)・ストリーミング・バッチ・キャッシュのうち、場面に合う組み込み方を 1 つ **選べる**
3. 性能・速度・費用の条件から、モデルと effort・キャッシュ・バッチの組み合わせを **選べる**
4. ツールの定義・結果の返し方・MCP のつなぎ方を、呼び出しの流れに沿って **順に言える**
5. ワークフローの型とエージェントの使い分けを、手順が決まっているかで **判断できる**
6. プロンプトインジェクション・権限・幻覚への対策を、入力と出力のどちらで防ぐかで **分けられる**
7. 試験ガイドの範囲から自分の弱い範囲を見つけ、公式ドキュメントのページで **確かめられる**

## 単元の構成

| 単元 | 内容 | 時間 | 主なドメイン |
| --- | --- | --- | --- |
| M0 `m0-exam-and-sources` | 試験の全体像と公式の情報源 | 1h | 全体 |
| M1 `m1-messages-api` | Messages API の基本 | 5h | Applications and Integration |
| M2 `m2-integration` | アプリに組み込む(エラー・ストリーミング・バッチ・ファイル) | 5h | Applications and Integration |
| M3 `m3-models-and-cost` | モデルの選択と費用・速度の調整 | 5h | Model Selection and Optimization |
| M4 `m4-prompt-and-context` | プロンプトとコンテキストの設計 | 4h | Prompt and Context Engineering |
| M5 `m5-tools-and-mcp` | ツール使用と MCP | 4h | Tools and MCPs |
| M6 `m6-agents` | ワークフローとエージェント | 5h | Agents and Workflows |
| M7 `m7-safety` | 安全性とセキュリティ | 3h | Security and Safety |
| M8 `m8-claude-code-and-evals` | Claude Code の設定と評価・デバッグ | 2h | Claude Code / Eval, Testing, and Debugging |
| M9 `m9-mock-exam` | 模擬試験(自作 53 問) | 3h | 全体 |
| M10 `m10-final-review` | 直前対策(紛らわしい機能の切り分け・ドメイン別ドリル・受験の手続き) | 3h | 全体 |

## takeaway 一覧

ID の 1 桁目が単元です。**M0〜M2 は本文と課題を書いてあります。** M3 以降は、講師がこの一覧と公式の情報源の対応を確認してから
本文を書きます(THEME_TO_COURSE.md の STEP 4)。takeaway は公式ドキュメントの見出しの範囲で確かめてから確定します。

### M0 試験の全体像と公式の情報源(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 0-1-1 | `l1-exam-overview/t1-developer-cert` | Developer 資格が測るもの | Developer: Foundations は、Claude でアプリを作るエンジニアの資格です。 | 認定試験, Developer資格, Claude API, ツール使用, エージェント | — |
| 0-1-2 | `l1-exam-overview/t2-who-can-take` | 受験できる人 | 受験できるのは、Claude Partner Network に加盟した組織の人です。 | Claude Partner Network, Partner Academy | 認定試験 |
| 0-1-3 | `l1-exam-overview/t3-proctored-exam` | 監督つきの試験 | 試験は監督つきで行われ、始める前に本人確認があります。 | 監督つき試験, 本人確認, デジタルバッジ | 認定試験 |
| 0-2-1 | `l2-official-sources/t1-exam-guide` | 範囲は試験ガイドで確かめる | 出題の範囲と配点は、Partner Academy の試験ガイドで確かめます。 | 試験ガイド, 出題範囲, 配点 | 認定試験, Partner Academy |
| 0-2-2 | `l2-official-sources/t2-platform-docs` | API の仕様は公式ドキュメントで確かめる | API の動きは、公式ドキュメントの該当ページで確かめます。 | 公式ドキュメント, Messages API | Claude API |
| 0-2-3 | `l2-official-sources/t3-code-docs` | Agent SDK の仕様は Claude Code のドキュメントにある | Agent SDK の仕様は、Claude Code のドキュメントで確かめます。 | Agent SDK, Claude Code | 公式ドキュメント, エージェント |
| 0-2-4 | `l2-official-sources/t4-no-leaked-questions` | 本番の問題を写した教材は使わない | 本番の問題を写したとされる問題集は、学習に使いません。 | 非公式の問題集 | 試験ガイド |

### M1 Messages API の基本(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 1-1-1 | `l1-request-response/t1-send-history` | 会話は毎回まとめて送る | Messages API は会話を覚えないので、それまでのやり取りを messages の配列で毎回送ります。 | リクエスト, 応答, messages, role, 会話の履歴 | Messages API |
| 1-1-2 | `l1-request-response/t2-system` | 前提は system に書く | 最初から効かせる役割や前提は、messages ではなく system に書きます。 | system | messages, リクエスト |
| 1-1-3 | `l1-request-response/t3-max-tokens` | 出力の上限を決める | max_tokens は出力の上限で、届くと応答はそこで止まります。 | max_tokens, トークン | リクエスト, 応答 |
| 1-1-4 | `l1-request-response/t4-content-blocks` | 応答はブロックの配列 | 応答の content は、type で形の決まるブロックの配列です。 | content, コンテンツブロック, type | 応答 |
| 1-2-1 | `l2-sdk/t1-official-sdk` | SDK で呼ぶ | API は公式の SDK から呼び、一時的なエラーの送り直しを SDK に任せます。 | SDK, 送り直し | Claude API, リクエスト |
| 1-2-2 | `l2-sdk/t2-api-key` | API キーをコードに書かない | API キーはコードに書かず、環境変数 ANTHROPIC_API_KEY から SDK に読ませます。 | API キー, 環境変数, ANTHROPIC_API_KEY | SDK |
| 1-2-3 | `l2-sdk/t3-model-id` | モデルを ID で指す | モデル ID は決まったスナップショットを指し、新しい版は別の ID で出ます。 | モデル ID, スナップショット | リクエスト |
| 1-3-1 | `l3-stop-reasons/t1-branch-by-stop-reason` | 止まった理由で分ける | 応答の処理は、stop_reason の値ごとに分けます。 | stop_reason, end_turn | 応答 |
| 1-3-2 | `l3-stop-reasons/t2-max-tokens-stop` | 上限で切れた応答 | stop_reason が max_tokens の応答は、途中で切れています。 | 途中で切れた応答 | stop_reason, max_tokens |
| 1-3-3 | `l3-stop-reasons/t3-refusal` | 拒否された応答 | stop_reason が refusal の応答は、エラーではなく拒否として扱います。 | refusal, 拒否 | stop_reason |

### M2 アプリに組み込む(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 2-1-1 | `l1-errors/t1-retryable-errors` | 送り直せるエラー | 429 と 529 は、時間を置いて送り直すと通ることがあるエラーです。 | HTTP ステータス, 429, 529 | 送り直し, リクエスト |
| 2-1-2 | `l1-errors/t2-backoff` | 送り直しの間隔 | 送り直しは、間隔を広げながら回数の上限を決めて行います。 | 指数バックオフ, retry-after | 429, 529, SDK |
| 2-1-3 | `l1-errors/t3-request-id` | request ID を控える | 調査と問い合わせのために、応答の request ID を記録します。 | request ID | 応答, SDK |
| 2-1-4 | `l1-errors/t4-rate-limit-headers` | 制限の残りを見る | 応答のヘッダーで、レート制限の残りを確かめます。 | レート制限, レスポンスヘッダー | 429, 応答 |
| 2-2-1 | `l2-streaming/t1-show-as-it-arrives` | 届いた順に表示する | 長い応答は、ストリーミングで届いた順に表示します。 | ストリーミング | 応答, max_tokens, SDK |
| 2-2-2 | `l2-streaming/t2-delta-events` | 差分のイベント | ストリーミングでは、本文が差分のイベントとして順に届きます。 | イベント, text_delta, message_delta | ストリーミング, stop_reason, コンテンツブロック |
| 2-2-3 | `l2-streaming/t3-final-message` | まとめた応答を受け取る | イベントを1つずつ扱わなくても、SDK で最後にまとめた応答を受け取れます。 | finalMessage | イベント, SDK |
| 2-3-1 | `l3-batches/t1-batch-when` | 急がない大量の処理 | 急がない大量の処理は、Message Batches API にまとめて送ります。 | Message Batches API, バッチ, custom_id | リクエスト, Messages API |
| 2-3-2 | `l3-batches/t2-batch-price` | バッチの料金 | Message Batches API の料金は、通常の半額です。 | バッチの料金 | Message Batches API |
| 2-3-3 | `l3-batches/t3-batch-results` | バッチの結果を受け取る | バッチの結果は、すべて終わるか 24 時間たつと受け取れます。 | バッチの結果 | バッチ, custom_id |
| 2-4-1 | `l4-files-and-media/t1-files-api` | 何度も使うファイル | 何度も使うファイルは、Files API に上げて ID で指します。 | Files API, file_id | コンテンツブロック, リクエスト |
| 2-4-2 | `l4-files-and-media/t2-images-and-pdf` | 画像と PDF を渡す | 画像と PDF は、content のブロックとして渡します。 | image ブロック, document ブロック | content, file_id |

### M3 モデルの選択と費用・速度の調整

| ID | タイトル | takeaway |
| --- | --- | --- |
| 3-1-1 | 選ぶ基準を先に決める | モデルは、性能・速度・費用の優先順位を決めてから選びます。 |
| 3-1-2 | 自分の課題で比べる | 候補のモデルは、自分の課題の評価で比べます。 |
| 3-1-3 | モデルを使い分ける | 難しい判断と単純な処理で、モデルを使い分けます。 |
| 3-2-1 | 同じ前半を使い回す | 毎回同じ前半のプロンプトは、プロンプトキャッシュで使い回します。 |
| 3-2-2 | 変わる部分は後ろに置く | キャッシュは前から順に一致した部分に効くので、変わる部分はプロンプトの後ろに置きます。 |
| 3-2-3 | 送る前に量を数える | 入力のトークン数は、送る前に数えて確かめます。 |
| 3-3-1 | かける量を決める | effort で、応答にかけるトークンの量を調整します。 |
| 3-3-2 | 考えさせる | 難しい推論には、考える過程を使わせます。 |
| 3-3-3 | 速さが要るとき | 応答の速さが要るときは、小さいモデルと短い出力を選びます。 |

### M4 プロンプトとコンテキストの設計

| ID | タイトル | takeaway |
| --- | --- | --- |
| 4-1-1 | 具体的に頼む | やってほしいことは、背景を添えて具体的に書きます。 |
| 4-1-2 | 例で形を伝える | 期待する出力の形は、例を示して伝えます。 |
| 4-1-3 | タグで区切る | 指示と資料は、XML のタグで区切ります。 |
| 4-2-1 | 決まった形の JSON | 決まった形の JSON が要るときは、構造化出力でスキーマを渡します。 |
| 4-2-2 | ツールの入力を守らせる | ツールの入力をスキーマどおりにさせるには、strict を指定します。 |
| 4-3-1 | 枠に収める | 入力と出力は、合わせてコンテキストウィンドウに収めます。 |
| 4-3-2 | 効く情報だけを入れる | コンテキストには、判断に効く情報だけを入れます。 |
| 4-3-3 | 長い会話を縮める | 長い会話は、圧縮して続きを枠に収めます。 |

### M5 ツール使用と MCP

| ID | タイトル | takeaway |
| --- | --- | --- |
| 5-1-1 | ツールを実行するのはアプリ | 自分で定義したツールは、Claude が呼び出しを求め、アプリが実行します。 |
| 5-1-2 | 結果を返す | ツールの結果は tool_result にして、次のリクエストで返します。 |
| 5-1-3 | 失敗を返す | ツールが失敗したら、is_error を付けて結果を返します。 |
| 5-1-4 | Anthropic 側で動くツール | サーバーツールは、Anthropic の側で実行されます。 |
| 5-2-1 | 説明に書くこと | ツールの説明には、いつ使い、何を返すかを書きます。 |
| 5-2-2 | ツールを使わせる | ツールを必ず使わせたいときは、tool_choice で指定します。 |
| 5-2-3 | ツールは少数にまとめる | 似たツールを並べず、目的ごとに少数のツールにまとめます。 |
| 5-3-1 | 共通の約束でつなぐ | MCP は、ツールやデータを Claude につなぐための共通の約束です。 |
| 5-3-2 | API から MCP を使う | MCP コネクターを使うと、Messages API からリモートの MCP サーバーを使えます。 |
| 5-3-3 | SDK から MCP を使う | Agent SDK では、MCP サーバーを設定に足してツールを使えるようにします。 |

### M6 ワークフローとエージェント

| ID | タイトル | takeaway |
| --- | --- | --- |
| 6-1-1 | 手順を決めるのは誰か | 手順をコードで決める仕組みがワークフローで、手順を Claude に任せる仕組みがエージェントです。 |
| 6-1-2 | 単純な作りから始める | まず単純な作りで試し、効果が確かめられたときだけ複雑にします。 |
| 6-2-1 | 段に分けてつなぐ | 大きな処理は、確かめやすい段に分けて順につなぎます。 |
| 6-2-2 | 入力で振り分ける | 入力の種類で、扱う指示やモデルを振り分けます。 |
| 6-2-3 | 並べて同時に処理する | 互いに独立した部分は、並べて同時に処理します。 |
| 6-2-4 | 指揮役が仕事を配る | 分け方が事前に決まらない仕事は、指揮役が分けて配ります。 |
| 6-2-5 | 評価役に直させる | 評価の基準がはっきりした仕事は、評価役の指摘で直させます。 |
| 6-3-1 | エージェントのループ | Agent SDK は、ツールの実行と結果の受け渡しを繰り返すループを持っています。 |
| 6-3-2 | サブエージェントに渡す | サブエージェントは自分の会話で動くので、要る情報を渡して呼びます。 |
| 6-3-3 | 作業を再開する | 続きの作業は、セッションを引き継いで再開します。 |

### M7 安全性とセキュリティ

| ID | タイトル | takeaway |
| --- | --- | --- |
| 7-1-1 | 外の文章は指示ではない | ツールで取った外の文章は、指示ではなくデータとして扱います。 |
| 7-1-2 | 危ない入力をふるい分ける | 危ない入力は、本処理の前にふるい分けます。 |
| 7-1-3 | 権限を絞る | エージェントが使えるツールは、許可の設定で作業に要るものに絞ります。 |
| 7-2-1 | 分からないと言わせる | 分からないときは分からないと答えてよい、と指示に書きます。 |
| 7-2-2 | 引用から答えさせる | 長い資料の事実は、先に引用を抜き出させてから答えさせます。 |
| 7-2-3 | 秘密を残さない | API キーや個人情報を、プロンプトとログに残しません。 |

### M8 Claude Code の設定と評価・デバッグ

| ID | タイトル | takeaway |
| --- | --- | --- |
| 8-1-1 | 毎回効かせる約束 | 毎回効かせたいプロジェクトの約束は、CLAUDE.md に書きます。 |
| 8-1-2 | 必ず実行する処理 | 必ず実行したい処理は、指示ではなく hook で決めます。 |
| 8-1-3 | 共有する設定の置き場所 | チームで共有する設定は、プロジェクトの設定ファイルに置きます。 |
| 8-2-1 | 成功の基準を先に決める | 作る前に、測れる成功の基準を決めます。 |
| 8-2-2 | 同じ評価で比べる | プロンプトを変えたら、同じ評価のセットで前と比べます。 |
| 8-2-3 | ツールの誤用を直す | ツールの誤用は、説明とスキーマから直します。 |

### M9 模擬試験 / M10 直前対策

- M9: 自作 53 問を 1 レッスンの知識問題として持つ(配分は試験ガイドの配点に合わせ、講師の確認後に確定)。
  各問の解説に対応する単元のトピック ID と公式ドキュメントのページを付け、誤答分析に使う。
  **本番に合わせるのは問題数と時間だけ**で、時間は受講者が自分で計る。本番は日本語でも受験できるので、設問・解説とも日本語で書く
- M10: 紛らわしい機能の切り分け(バッチとストリーミング、キャッシュとバッチ、構造化出力と strict、
  MCP コネクターと Agent SDK の MCP、ワークフローとエージェント)・範囲別のドリル・受験の手続きと当日

## 手を動かす課題

各単元に、VS Code 拡張の「STELLA: 課題を確認する」で確かめる課題を置きます(runner は `node-test`、環境は `node-test-01`)。
ひな形は `templates/runners/node-test/` で、テスト(Vitest)・ESLint・Prettier を拡張と同じ固定の手順で動かします。

- **API キーなしで解ける形にする。** 受講者の関数は Claude のクライアントを引数で受け取り、テストは Messages API の応答の形
  (content のブロック・stop_reason・usage など)を返す偽のクライアントを渡す。偽のクライアントは `tests/` に置き、`protected` にする
- 応答の形は公式ドキュメント(Using the Messages API・Handle tool calls・Streaming messages など)の例に合わせ、課題文に出典を付ける
- 本物の API で試すのは任意の発展とし、課題文の末尾に書くだけにする(費用がかかるため完走条件にしない)
- 種別ごとのヒント・解答例の出し方は ADDING_COURSE.md の表に従う。基礎はヒント 2 段、自力はヒント 2 段 + 挑戦 5 回で解答例

| 単元 | 課題 | 種別 | 作るもの(テストが確かめること) |
| --- | --- | --- | --- |
| M0 | `q01-study-plan` 配点に合わせて学習時間を配る(**実装済み**) | 基礎 | 配点の合計に対する割合で時間を配り、0.5 時間単位に丸める |
| M1 | `q01-build-messages` 会話の履歴を組み立てる(**実装済み**) | 基礎 | これまでのやり取りと新しい発言から、system と messages を持つリクエストを作り(履歴の配列は書き換えない)、応答のテキストのブロックをつなぐ |
| M1 | `q02-route-stop-reason` 止まった理由で処理を分ける(**実装済み**) | 自力 | stop_reason ごとに、答え・途中で切れた応答・ツールの呼び出し・拒否(表示用の説明)を返し、表にない値は扱いを決めていない値として返す(説明欄あり) |
| M2 | `q01-retry-transient` 送り直せるエラーだけを送り直す(**実装済み**) | 自力 | 429・500・529 だけを、retry-after か倍になる間隔で、上限の回数まで送り直す(待ち時間の関数は引数で受け取る。説明欄あり) |
| M2 | `q02-collect-stream` ストリームから本文を組み立てる(**実装済み**) | 基礎 | イベントの列から text_delta の差分だけをつなぎ、message_delta の stop_reason を返す(知らないイベントは読み飛ばす) |
| M2 | `q03-batch-requests` バッチのリクエストを組み立てる(**実装済み**) | 基礎 | 問い合わせの一覧から custom_id の重ならないリクエストの束を作り、結果を custom_id で引く |
| M3 | `q01-cache-friendly-prompt` キャッシュが効く順に並べる | 基礎 | 変わらない資料を前に、変わる質問を後ろに置き、資料の終わりに cache_control を付ける |
| M3 | `q02-estimate-cost` 費用を見積もる | 自力 | トークン数と単価(引数)から、通常・バッチ・キャッシュを使った場合の費用を比べる |
| M4 | `q01-tagged-prompt` 指示と資料を分ける | 基礎 | 資料を XML のタグで包み、指示と混ざらないプロンプトを作る |
| M4 | `q02-extraction-schema` 抽出のスキーマを書く | 自力 | 必須の項目・分からないときの値(null や "unknown")を含む JSON スキーマを書き、代表の出力で確かめる |
| M5 | `q01-tool-loop` ツール使用のループを回す | 自力 | tool_use を受けてツールを実行し、tool_result を返して、end_turn まで繰り返す |
| M5 | `q02-fix-tool-error` ツールの失敗で止まるのを直す | 修正 | 例外でループが止まる不具合を、is_error を付けた結果を返す形に直す(修正記録あり) |
| M6 | `q01-router` 入力で振り分ける | 自力 | 分類の結果に応じて、扱う関数とモデルを選ぶ |
| M6 | `q02-chain-with-gate` 段に分けてつなぐ | 自力 | 段ごとの結果を確かめ、条件を満たさなければ次の段へ進まない |
| M7 | `q01-wrap-untrusted` 外の文章をデータとして渡す | 基礎 | ツールで取った文章をタグで包み、指示として扱わないことを指示に書く |
| M7 | `q02-least-privilege` 要るツールだけを許可する | 自力 | 作業の種類から、許可するツールの一覧を最小にして返す |
| M8 | `q01-eval-compare` 評価のセットで比べる | 自力 | 評価のケースを回して合格率を出し、変更前と変更後を比べる |
| M10 | `q01-support-assistant` 問い合わせに答えるアシスタント | 確認A | ツール使用・送り直し・構造化出力を組み合わせ、偽のクライアントで最後まで動かす(説明欄あり) |

M1・M2 の課題は、応答・イベント・結果の形をした値や、偽の送信の関数を受け取る関数なので、クライアントは使いません。M3 以降の課題は、単元の本文と一緒に実装します(課題文の出典は単元の `references.json` に記録する)。

## 決めていないこと(講師と相談)

- M1 以降を書き始める時期(試験ガイドで takeaway 一覧と範囲の対応を確かめてから)
- M9 の 53 問の範囲ごとの配分(試験ガイドの配点を確かめてから)

## クレジット(原典)

この講座は、公式ドキュメントと Anthropic の記事を **材料として参照し、社内エンジニア向けに順序・粒度を組み直した独自教材**です。
翻訳・転載ではなく、本文・図解・知識問題はすべて自作します。資料と使用箇所の対応は単元の `references.json` に記録し、
各トピック・まとめ・知識問題の出典表示はそこから生成します。

- 公式ドキュメントの文章・図・コード例はそのまま使いません。コード例は教材用に書きます
- 試験ガイド・準備の講座・サンプル問題は Partner Academy の利用条件の下にあるので、教材に写しません
- Claude / Claude Code / Agent SDK / MCP は製品名・仕様名として本文で使います。公式のロゴは使いません
