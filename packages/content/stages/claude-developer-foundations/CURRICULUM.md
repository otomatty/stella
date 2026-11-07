# Claude Certified Developer 対策 カリキュラム

Anthropic の認定資格 **Claude Certified Developer: Foundations** の対策のステージです。
Claude API でアプリを作るエンジニア向けの試験で、範囲は Claude API・ツール使用・エージェント開発が中心です。
11 単元・計 40 時間(1 日 2〜3 時間で約 4 週間)で試験の範囲を一巡し、自作の模擬試験と直前対策で仕上げます。
1 トピック = 覚えることが 1 つ(takeaway 1 文)の粒度で、機能名の暗記ではなく
「場面を読んで、公式ドキュメントで確かめた作り方を選べる」状態を目指します。

- Web(LMS): スライド視聴・まとめ・知識問題(合格点 80)。format 2 のステージで、知識問題は SRS の復習カードにもなる
- 手を動かす部分: 各単元に VS Code 拡張の課題(`node-test-01`、Vitest)を置く(下の「手を動かす課題」)。
  Claude API の応答はテストの中で偽のクライアントに差し替えるので、**API キーと有料の API 呼び出しは完走条件にしない**
- 置き場所: スキルツリーの **Anthropic認定資格** の島(表示条件は `dev-env-basics` のクリア)。
  旧 AI駆動開発の島(AI駆動開発の考え方・Claude チャット入門・Claude Code 入門・Skills とサブエージェント・
  検証・hooks・MCP・Cowork 入門の 6 ステージ)は 2026-10 に退役させ、このステージを一から作り直す
- 前提ステージ: **開発環境とWebの入口(`dev-env-basics`)**。Node.js と VS Code の拡張で課題を確かめられる状態から始める
  (`stage.json` の `prerequisites` に対応)。Claude Code も、試験の範囲のぶんはこのステージで扱う(M8)
- 推奨(解放条件にはしない): JavaScript / TypeScript で関数と非同期の HTTP 通信が読めること
  (`javascript-basics`・`http-async-basics` の範囲)。試験ガイド v1.0 の受験者像は Python か TypeScript が使える人です(推奨で必須ではない。下記)
- 問題はすべて自作です。公式のサンプル問題・非公式の問題集・本番の問題を写したとされる教材の転載はしません
- **合格を保証するものではありません**
- 対象外:
  - Associate: Foundations・Architect: Foundations・Architect: Professional の対策
  - Managed Agents・管理用 API(Admin API など)・クラウド各社経由の提供形態の**詳しい手順**(どれを選ぶかは範囲に入れます。試験ガイド v1.0 の 1.2・2.3・7.4。下の「試験ガイド v1.0 での見直し」)
  - 他社のエージェントの枠組み(Strands・LangGraph・PydanticAI)の使い方(位置づけと選び方だけを扱います。試験ガイド v1.0 の 1.3)
  - 有料の API 呼び出しや API キーを前提にした課題
  - 模擬試験専用の計時・採点の仕組み(模試の中身は M9 の知識問題として持つ)

## 教材要件シート

- ステージ名 / slug: Claude Certified Developer 対策 / `claude-developer-foundations`
- 新しいステージ or 既存のステージへの追加: 新しいステージ(Anthropic認定資格の島。前提は `dev-env-basics`)
- 対象者(受講直前の状態): 開発環境を整え、VS Code の拡張で課題を確かめられる。次は Claude API でアプリやエージェントを作る/
  Developer: Foundations を受験する予定の社内エンジニア。所属組織が Claude Partner Network に加盟していること(受験資格)
- 前提ステージ / 前提知識: `dev-env-basics`(解放条件)。JavaScript / TypeScript の読解は推奨
- 到達目標: 下の「到達目標」
- スコープ外: 上の「対象外」
- 評価方法: 知識問題あり(各レッスン、合格点 80) / コード演習あり(各単元、`node-test-01`。下の「手を動かす課題」) / 模擬試験 = 知識問題(M9)
- 規模: 11 単元 / 30 レッスン / 91 トピック / 知識問題 213 問(M9 の模擬試験 53 問と M10 のドリル 24 問を含む) / 課題 18 問。下の「試験ガイド v1.0 での見直し」の案を入れると、17 レッスン・47 トピック(うち優先 A は 39、優先 B は 8)と課題 3〜6 問が増え、予定は 54 時間前後になります(案)
- 出典: 公式ドキュメント(Claude Developer Platform・Claude Code)と Anthropic の記事。下の「公式の情報源」。範囲と配点は試験ガイド v1.0(2026-07。講師の確認待ち)
- 参照元の台帳: `sources/registry.json`
- 使用箇所と表示: 単元の `references.json`、各トピック・まとめ・知識問題の `sourceRefs`
- 書く人 / 改訂する人: 講師(承認者)。試験ガイドの改訂(下記)ごとに範囲の対応を見直す

## 試験の前提(調査 2026-10-31、2026-11-07 に試験ガイド v1.0 で更新)

**試験ガイド v1.0(2026-07、CCDV-F)の PDF を、2026-11-07 に Partner Academy の配信元(Skilljar のファイル置き場)の公開 URL から読めました。**
第三者の練習問題サイト CertSafari が「Official study guide」としてリンクしていたファイルです:
`https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf`
Partner Academy にあるガイドと同じかは、講師が確かめます。下の表の出典「試験ガイド v1.0」はこの PDF のことで、確度の ◎ は講師の確認までの暫定です。
ガイドは Partner Academy の利用条件の下にあるので、教材(スライド・まとめ・知識問題)には写しません。

講師が確かめるページ(ログインが必要なものを含む):

- 4 資格の一覧と、各資格の試験ガイド・準備講座・申し込み: https://anthropic-partners.skilljar.com/page/partner-certifications
- 試験の準備講座: https://anthropic-partners.skilljar.com/page/claude-certification-exam-prep-courses
- 受験資格: https://anthropic-partners.skilljar.com/page/certification-eligibility
- よくある質問: https://anthropic-partners.skilljar.com/page/faq-certifications
- Pearson の Anthropic のページ(出題の改訂の案内): https://www.pearsonvue.com/us/en/anthropic.html

執筆環境からは `anthropic-partners.skilljar.com`・`www.pearsonvue.com`・`modelcontextprotocol.io`・
`www.credly.com` に届かず、Pearson と Credly の記述は Web 検索の要約経由です。
2026-11-07 の時点では、`platform.claude.com` と `code.claude.com` には届き、`modelcontextprotocol.io` には届きません。

| 項目 | 内容 | 確度 | 出典 |
| --- | --- | --- | --- |
| 対象者 | Claude でアプリ・エージェント・ワークフローを作って出すエンジニア。API の組み込み・エージェントとツールの作成・プロンプトとコンテキスト・評価・安全・モデル選びを扱う | ◎ | 試験ガイド v1.0 §1・§3、claude.com の発表(2026-07-23) |
| 受験資格 | Claude Partner Network の加盟組織の人。加盟は無料で、組織が受験者を登録する | ◎ | claude.com の発表(2026-07-23) |
| 前提 | 必須の前提・講座はない。推奨は開発の実務 1〜5 年・Claude か LLM の実務 6 か月以上・Python か TypeScript・REST と CLI | ◎ | 試験ガイド v1.0 §4 |
| 実施 | Pearson VUE が監督つきで実施(オンラインか会場)。当日は写真つきの公的な身分証明書が要る。合格者は Credly のデジタルバッジ | ◎ | 試験ガイド v1.0 §5・§11、claude.com の発表 |
| 準備の講座 | 資格ごとの準備講座が Anthropic Partner Academy にある | ◎ | claude.com の発表 |
| 組織の人数 | 認定は個人に属する。有効な認定を持ち、直近 90 日に Claude を使った人を数える | ◎ | anthropic.com の Services Track(2026-06-03) |
| 形式 | 53 問・120 分。1 つ選ぶ問題と複数選ぶ問題があり、選ぶ数は問題文に書かれる | ◎ | 試験ガイド v1.0 §5 |
| 合格点と成績 | 尺度点 100〜1000 のうち 720 で合格。成績表には合否・尺度点と、ドメインごとの正答率が出る(合否は総合の尺度点だけで決まる) | ◎ | 試験ガイド v1.0 §5・§9 |
| 受験料 | 125 USD。加盟の段階による割引は申し込みの画面に出る | ◎ | 試験ガイド v1.0 §5・§10 |
| 申し込みと変更 | Partner Academy で申し込み、Pearson VUE で日時を選ぶ。変更と取り消しは 24 時間前まで | ◎ | 試験ガイド v1.0 §10 |
| 再受験 | 不合格のあとの待ち期間は 14 日・30 日・90 日と延びる。12 か月で 4 回まで。受験料は毎回かかる | ◎ | 試験ガイド v1.0 §11 |
| 有効期間と更新 | 12 か月。期限内なら Partner Academy の無料・監督なしの評価で更新できる。切れたら全額で受け直す。内容が大きく変われば受け直しを求めることがある | ◎ | 試験ガイド v1.0 §14 |
| 言語 | 日本語でも受験できる | ○ | 講師の確認(2026-10-31)。それ以前の受験記には英語のみとある |
| 組織の人数への算入 | Developer は算入される(Associate は算入されない) | △ | 第三者の解説 |
| **出題の改訂** | **2026-12-07 から出題が変わり、新しい試験ガイドは 2026-11-17 に出る** | ○ | Pearson のページ(検索の要約)。CertSafari も 2026-10-30 の確認でガイドは v1.0 のまま |

### 改訂への備え

- 2026-12-07 以降に受験する受講者は、11-17 に出る新しい試験ガイドで準備します(Pearson の案内)
- このステージは**機能の単元(M1〜M8)を試験のドメイン名で切らず**、公式ドキュメントの区分で切っています。
  ドメインの名前・配点が変わっても、単元の本文は機能の仕様が変わらない限り直さずに済み、
  下の対応表と M0・M9・M10 を直せば追従できます
- 新しい試験ガイドが出たら: 講師がガイドを確認 → 下の対応表と単元の時間配分を更新 → M9 の模試の配分を直す →
  改訂した単元は `unitId` の版を上げ、参照元を確かめ直してから `contentHash` を更新する
- ステージの説明・タイトル・到達説明(`stage.json`)は全単元の内容指紋に入ります。M0〜M10 がそろったので、講師の指示
  (2026-10-31)で説明から「【準備中】」と「単元を順に公開しています」を外し、全単元の版を 1 つ上げました
  (M0 は @3、M1〜M10 は @2。本文と参照元の対応は変わらない)
- 2026-11-07 に、試験ガイド v1.0 のサブ項目で設計を見直しました(下の「試験ガイド v1.0 での見直し」)。本文はまだ書かず、11-17 の新しいガイドで対応を直してから書きます
- 12-07 より前に受ける受講者は v1.0 の範囲で受けます。今の M0〜M10 で足りないサブ項目は、見直しの一覧の「確かめる公式ページ」で補うよう案内します

### ドメインと配点(試験ガイド v1.0、2026-07)

| ドメイン | 配点 | 対応する単元 |
| --- | --- | --- |
| Applications and Integration | 33.1% | M1・M2(API の仕組み)。見直しで M1(1-5)・M2(2-5・2-6)・M3(3-5)・M8(8-3〜8-6)を足す |
| Model Selection and Optimization | 16.8% | M3。見直しで M1(1-4・1-5)・M3(3-4)を足す |
| Agents and Workflows | 14.7% | M6。見直しで M6(6-4・6-5)を足す |
| Prompt and Context Engineering | 11.0% | M4。見直しで M4(4-4)を足す |
| Tools and MCPs | 10.6% | M5。見直しで M5(5-4・5-5)を足す |
| Security and Safety | 8.1% | M7。見直しで M7(7-3・7-4)と 8-1-4 を足す |
| Claude Code | 3.1% | M8。見直しで M8(8-3)を足す |
| Eval, Testing, and Debugging | 2.6% | M8。見直しで M8(8-5)を足す |

ドメインの下のサブ項目(25)と配点は、下の「試験ガイド v1.0 での見直し」の「サブ項目ごとの対応」にあります。

配点は講師が試験ガイドで確かめるまで、受講者向けの本文(スライド・まとめ・知識問題)に数字を書きません。
M0 は「試験ガイドの配点で時間を配る」ことだけを教え、数字はガイドを開いて確かめさせます。

## 試験ガイド v1.0 での見直し(2026-11-07)

### 見つかったこと

- ドメインの対応だけを見ていて、ドメインの中の穴が見えていませんでした。Applications and Integration(33.1%)に当てた M1・M2 が扱うのは、サブ項目 2.3 Claude API Mechanics(6.8%)だけです。Model Selection and Optimization(16.8%)に当てた M3 が扱うのは、5.3(2.7%)と 5.4(2.8%)だけです。
- M9 の模擬試験も同じ形です。Applications and Integration の 17 問は復習の戻り先がすべて M1・M2、Model Selection and Optimization の 9 問はすべて M3 です。
- サブ項目で見ると、十分に扱えているのは配点の 29.6%、一部だけが 41.4%、ほとんど扱っていないのが 29.0% です(講師の判定の前の、執筆者の見立て)。

### サブ項目ごとの対応

判定: ◎ 十分 / ○ ほぼ足りる / △ 一部だけ / × ほとんど無い。括弧つきの ID は優先 B

| ID | サブ項目 | 配点 | 範囲の要点(言い換え) | 今のトピック | 判定 | 足すトピック(案) |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | Agent Architecture | 4.5% | ワークフローとエージェントの使い分け、指揮役と作業役の階層、サブエージェント | 6-1-1・6-1-2・6-2-1〜6-2-5・6-3-2・10-2-2 | ◎ | — |
| 1.2 | Agent Construction with Claude | 5.3% | Agent SDK、自前のループ、自前で動かすか Anthropic に任せるか、決まった処理のフック | 6-3-1・6-3-3・8-1-2 | △ | 6-4-1・6-4-2・8-1-4 |
| 1.3 | Agent Patterns and Frameworks | 4.9% | ツール使用のループ・サブエージェント・記憶・コンテキストの管理、他社の枠組み | 5-1-2・6-3-2・4-3-3 | △ | 6-5-2・6-5-3 |
| 2.1 | Understanding Requirements | 3.4% | 業務の要件から、機能と基盤の要件を決める | 3-1-1・10-1-1 | △ | 2-6-1・2-6-2 |
| 2.2 | Systems Life Cycle | 2.8% | 作る・動かす・保つ。モデルの寿命 | 1-2-3 | × | 3-5-1・3-5-2 |
| 2.3 | Claude API Mechanics | 6.8% | messages・ツール・ストリーミング・画像・thinking・キャッシュ・クラウド各社経由・バッチとリアルタイムの使い分け | M1・M2・3-2-1〜3-2-3・3-3-2・5-1-1〜5-1-4・10-1-1・10-1-2 | ○ | 2-6-2 |
| 2.4 | Software Engineering Foundations | 7.4% | REST・JSON・非同期・版管理・開発の工程への組み込み・コードレビュー・リファクタリング | — | × | 1-5-1・2-5-1・2-5-2・8-6-1・(8-6-2) |
| 2.5 | Claude Application Design | 8.6% | 面(claude.ai・Desktop・Claude Code・API・SDK)ごとの指示の読まれ方、内容の境界、スキーマの設計、セッションの衛生、プラグイン | 1-1-2・4-1-3・4-2-1・5-2-3・7-1-1(境界とスキーマだけ) | × | 8-3-4・8-4-1・8-4-2 |
| 2.6 | Configuration Management | 4.1% | CLAUDE.md・settings.json・モデルの版の固定・プロンプトの版管理・プラグインの依存 | 8-1-1・8-1-3・1-2-3・8-2-2 | △ | 1-5-3・8-3-1・8-4-2・8-4-3 |
| 3.1 | Claude Code Operation | 3.1% | Rules・Skills・コマンド・サブエージェント・記憶、セッション、headless・auto mode、CLAUDE.md の階層、settings.json | 8-1-1・8-1-3 | △ | 8-3-1〜8-3-4 |
| 4.1 | Debugging and Error Handling | 2.6% | エラーの種類、立て直し方、トレース、統合の側かモデルの出力かの切り分け | 2-1-1〜2-1-3・8-2-3・10-1-4 | △ | 8-5-1・8-5-2 |
| 5.1 | LLM Fundamentals | 5.2% | トークン・コンテキストウィンドウ・サンプリング・非決定性・次のトークンの生成、fast mode・extended / adaptive thinking・effort、zero / single / multi-shot | 1-1-3・4-3-1・3-1-3・3-3-2・4-1-2 | △ | 1-4-1・1-4-2・3-4-2・3-4-3・4-1-2 の改訂 |
| 5.2 | Technical Fundamentals | 6.1% | REST を包む SDK、WebSocket | 1-2-1 | × | 1-5-1・1-5-2・(2-5-3) |
| 5.3 | Model Selection and Tradeoffs | 2.7% | Opus・Sonnet・Haiku の向き、adaptive thinking の対応、質・速さ・費用、版の間の挙動の変化 | 3-1-1〜3-1-4 | ○ | 3-4-1・3-5-2・1-5-3 |
| 5.4 | Cost and Token Management | 2.8% | トークンの予算・使用量の記録・費用の見積もり・キャッシュ | 2-3-2・3-2-1〜3-2-3・3-3-1・10-1-2 | ◎ | — |
| 6.1 | Context Engineering | 3.8% | コンテキストの管理、劣化と肥大の防止(ツールの出力の刈り込み・圧縮)、サブエージェントでの分離 | 4-3-1〜4-3-3・6-3-2 | ○ | (6-5-1) |
| 6.2 | Prompt Engineering | 4.6% | 指示の明確さ・例・system と user の置き分け・出力の制約・繰り返しの改善・入力の無害化 | 1-1-2・4-1-1〜4-1-4・4-2-3・7-1-2・8-2-2 | ○ | — |
| 6.3 | Output Handling | 2.6% | 構造化出力・応答の検証・防御的なパース・自信のある出力を疑う | 4-2-1・4-2-2・7-2-1・7-2-2 | △ | 4-4-1・4-4-2 |
| 7.1 | AI Application Security | 3.2% | インジェクション・ジェイルブレイク・信頼できない入力・データの漏えい・個人情報・認証と認可 | 7-1-1・7-1-2 | △ | 7-3-3・(7-3-4) |
| 7.2 | Guardrails and Safe Deployment | 2.3% | コンテンツポリシー・ガードレールの重ね方・最小権限 | 7-1-3 | △ | 7-3-1・5-4-4・(7-3-2) |
| 7.3 | Claude Hooks | 1.0% | フックで破壊的な操作を止める | 8-1-2 | △ | 8-1-4 |
| 7.4 | Identity, Secrets, and Key Management | 1.6% | 鍵の管理・本人の確かめ・権限の確認・使われ方の監視 | 1-2-2・7-2-3 | △ | 1-5-2・7-4-1・(7-4-2)・(7-4-3) |
| 8.1 | Tool Implementation | 4.4% | ツールの定義と説明・エラー・クライアントとサーバーのツール・承認・ツールの組み立て | 5-1-1〜5-1-4・5-2-1〜5-2-4・8-2-3 | ◎ | 5-4-4 |
| 8.2 | MCP Server Development | 2.1% | サーバーの作成と配置、リソース・ツール・プロンプト、stdio などのつなぎ方 | 5-3-1〜5-3-3・10-2-1 | △ | 5-5-1・(5-5-2) |
| 8.3 | Agentic Customization | 4.1% | 組み込みツール・自作ツール・Skills・MCP の選び分け | 5-1-4 | × | 5-4-1〜5-4-3 |

### 見直しの方針

- 単元は今までどおり公式ドキュメントの区分で切り、試験とは上の対応表で合わせます。
- 足すものは、今の単元の末尾に足すレッスン(と 8-1-4 のように今のレッスンの末尾に足すトピック)にします。新しい単元を M9 の前に入れると M9・M10 のディレクトリ名(単元の ID)が変わり、受講済みの進捗に響くので、単元は増やしません。
- 足すトピックは「選べる・説明できる」水準で書きます。Managed Agents・クラウド各社経由・他社の枠組みは、詳しい手順まで扱いません。
- 優先 A(39 トピック)を先に書き、優先 B(8 トピック)は 11-17 の新しいガイドを見て入れるかを決めます。
- 下の takeaway は**書く前の一覧(案)**です。今までの単元と同じく、公式ドキュメントの見出しの範囲で確かめてから確定します。

### 足すレッスンとトピック(案)

#### M1 に足す

レッスン `l4-how-llms-respond`(応答が作られる仕組み)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1-4-1 | `l4-how-llms-respond/t1-next-token` | 次のトークンを選んで続ける | LLM は、それまでのトークンから次のトークンを 1 つずつ選んで応答を書きます。 | LLM, 次のトークンの予測 | トークン, 応答 | 5.1 | A | Glossary(LLM / Tokens) |
| 1-4-2 | `l4-how-llms-respond/t2-not-deterministic` | 同じ入力でも応答は変わる | 次のトークンは確率に従って選ばれるので、同じリクエストでも毎回同じ応答になるとは限りません。 | サンプリング, 非決定性, temperature | 次のトークンの予測, リクエスト | 5.1 | A | Glossary(Temperature)・Migrating to API version 2026-10-21(Sampling parameters are removed)・Increase output consistency |

レッスン `l5-http-under-sdk`(SDK の下の HTTP)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1-5-1 | `l5-http-under-sdk/t1-rest-api` | SDK は HTTP の API を包む | SDK は、エンドポイントに JSON の本文を送る HTTP の API を、関数の呼び出しとして包んだものです。 | REST API, エンドポイント, JSON | SDK, Messages API, リクエスト | 5.2・2.4 | A | API overview(Request and response format)・Messages(API リファレンス) |
| 1-5-2 | `l5-http-under-sdk/t2-request-headers` | ヘッダーで鍵と版を伝える | HTTP で直接呼ぶときは、API キーを Authorization ヘッダー、API の版を anthropic-version ヘッダーで送ります。 | リクエストヘッダー, Authorization, anthropic-version | API キー, エンドポイント | 5.2・7.4 | A | API overview(Authentication)・Migrating to API version 2026-10-21(API keys are sent as Authorization: Bearer) |
| 1-5-3 | `l5-http-under-sdk/t3-api-version` | API の版を決めて上げる | API の版は日付で決まり、SDK のメジャーバージョンを上げると新しい版に切り替わるので、移行ガイドを読んでから上げます。 | API の版, 移行ガイド | anthropic-version, SDK | 2.6・5.3 | A | Versions・Migrating to API version 2026-10-21(Upgrade steps) |

#### M2 に足す

レッスン `l5-async`(非同期で呼ぶ)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2-5-1 | `l5-async/t1-async-call` | 待つ間に止めない | API の呼び出しは非同期の処理として書き、応答を待つ間もほかの処理を止めないようにします。 | 非同期処理, await | リクエスト, SDK | 2.4・5.2 | A | TypeScript SDK(Usage)。MDN の async function(他社の資料。台帳への登録は要相談) |
| 2-5-2 | `l5-async/t2-limit-concurrency` | 同時に送る数を絞る | 並べて送るリクエストの数は、レート制限に収まるように上限を決めます。 | 同時実行数 | 非同期処理, レート制限 | 2.4 | A | Rate limits(About rate limits) |
| 2-5-3 | `l5-async/t3-sse` | ストリーミングの届き方 | ストリーミングの応答は、サーバーから一方向に流れる SSE で届き、双方向の WebSocket とは仕組みが違います。 | SSE, WebSocket | ストリーミング, イベント | 5.2 | B | Streaming messages。WebSocket は Anthropic の資料に記述がない(MDN を使うかは要相談) |

レッスン `l6-requirements`(要件から作りを決める)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2-6-1 | `l6-requirements/t1-split-requirements` | 要件を 2 つに分ける | 業務の要件は、何をするか(機能要件)と、速さ・量・データの置き場所などの条件(非機能要件)に分けて書き出します。 | 機能要件, 非機能要件 | 応答, リクエスト | 2.1 | A | Choosing the right model(Establish key criteria)。要件の分け方そのものを書いた公式のページは見つかっていない |
| 2-6-2 | `l6-requirements/t2-where-to-run` | 呼び出し先を条件で選ぶ | データの置き場所や契約の条件が決まっているときは、Claude API ではなくクラウド各社の経由で Claude を呼びます。 | クラウドプラットフォーム, IAM | 非機能要件, Claude API | 2.1・2.3 | A | API overview(Claude API versus cloud platforms)・Claude in Amazon Bedrock・Claude Models on Google Cloud・Claude in Microsoft Foundry・API and data retention |

#### M3 に足す

レッスン `l4-model-options`(モデルと動かし方の選択肢)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3-4-1 | `l4-model-options/t1-model-families` | 系統ごとの向き | 迷ったら Opus から始め、速さと費用を優先する仕事では Sonnet・Haiku を自分の評価のセットで比べます。 | Opus, Sonnet, Haiku | モデルの選択, 評価のセット | 5.3 | A | Models overview(Compare models)・Choosing the right model。Fable・Mythos の位置づけも書く前に確かめる |
| 3-4-2 | `l4-model-options/t2-adaptive-thinking` | 考える量を任せる | 今のモデルは adaptive thinking で考える量を自分で決めるので、量は budget_tokens ではなく effort で調整します。 | adaptive thinking, extended thinking, budget_tokens | 考える過程, effort | 5.1・5.3 | A | Thinking(How thinking works の表)・Extended thinking (legacy) |
| 3-4-3 | `l4-model-options/t3-fast-mode` | 出力を速くする設定 | fast mode は、同じモデルの出力の速さを上げる代わりに、通常より高い単価がかかる設定です。 | fast mode | 速度, 費用 | 5.1 | A | Fast mode(How fast mode works / Pricing) |

レッスン `l5-model-lifecycle`(モデルの寿命)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3-5-1 | `l5-model-lifecycle/t1-model-status` | モデルは退役する | モデルは、非推奨になって退役の日が告げられ、退役したあとはリクエストが失敗します。 | 非推奨, 退役 | モデル ID | 2.2 | A | Model deprecations(Overview / Model status) |
| 3-5-2 | `l5-model-lifecycle/t2-migrate` | 退役の前に移る | 非推奨の告知が来たら、使っているモデル ID を洗い出し、置き換え先を自分の評価のセットで確かめてから移ります。 | 移行 | 非推奨, モデル ID, 評価のセット, 移行ガイド | 2.2・5.3 | A | Model deprecations(Auditing model usage / Migrating to replacements / Best practices)・Upgrade between model versions |

#### M4 に足す

レッスン `l4-output-handling`(出力を確かめて使う)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-4-1 | `l4-output-handling/t1-validate` | 使う前に検証する | 応答は、使う前に形と値をコードで検証し、通らなければ使わずに分岐します。 | 出力の検証 | 構造化出力, JSON スキーマ | 6.3 | A | Structured outputs(Important considerations)・Increase output consistency |
| 4-4-2 | `l4-output-handling/t2-defensive-parsing` | 読めない出力に備える | JSON として読めない応答や項目の欠けた応答も来るものとして、読み取りの失敗を処理の分岐として書きます。 | 防御的なパース | 出力の検証, スキーマに合わない出力 | 6.3 | A | Structured outputs(Important considerations)・Stop reasons and fallback |

#### M5 に足す

レッスン `l4-extension-choice`(足し方を選ぶ)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5-4-1 | `l4-extension-choice/t1-skills` | 手順を Skills にまとめる | Skills は指示・スクリプト・資料をまとめたフォルダーで、最初は説明だけが読まれ、使うときに中身が読み込まれます。 | Skills, SKILL.md, 段階的な読み込み | 指示, コンテキスト | 8.3 | A | Agent Skills overview(How Skills work / Skill structure / Where Skills work) |
| 5-4-2 | `l4-extension-choice/t2-builtin-first` | 用意されたツールを先に探す | Anthropic が用意したツールで足りる操作は、自分で作らずにそれを使います。 | 組み込みツール | サーバーツール, ツール | 8.3 | A | Tool use with Claude(Choose a tool)・Server tools |
| 5-4-3 | `l4-extension-choice/t3-skills-or-mcp` | 知識を足すか、つなぎ先を足すか | 手順や知識を足すなら Skills、外のシステムへのつなぎ先をいくつものアプリで共有するなら MCP サーバーを選びます。 | — | Skills, MCP サーバー | 8.3 | A | Extend Claude Code(Match features to your goal / Compare similar features)・Agent Skills overview |
| 5-4-4 | `l4-extension-choice/t4-approval` | 取り消せない操作は承認を挟む | 送信や削除のような取り消せない操作のツールは、実行の前に人の承認を挟みます。 | 承認 | ツール, tool_use | 8.1・7.2 | A | Handle approvals and user input(Agent SDK)・Configure permissions(Agent SDK) |

レッスン `l5-mcp-server`(MCP サーバーを作る)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5-5-1 | `l5-mcp-server/t1-mcp-primitives` | サーバーが出す 3 つのもの | MCP サーバーは、操作のツール・読むためのリソース・定型の頼み方のプロンプトの 3 つを出せます。 | MCP のリソース, MCP のプロンプト | MCP サーバー, ツール | 8.2 | A | Connect Claude Code to tools via MCP(Use MCP resources / Use MCP prompts as commands)。MCP の仕様のサイトは執筆環境から届かない |
| 5-5-2 | `l5-mcp-server/t2-sdk-mcp-server` | 自作の関数を MCP で出す | Agent SDK では、自作の関数をその場で動く MCP サーバーとして登録し、ツールとして使わせます。 | SDK の MCP サーバー | MCP サーバー, Agent SDK, mcpServers | 8.2・8.1 | B | Give Claude custom tools(Agent SDK) |

#### M6 に足す

レッスン `l4-build-and-host`(エージェントを作る場所)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6-4-1 | `l4-build-and-host/t1-own-loop` | ループを自分で回す | Messages API でエージェントを作るときは、stop_reason が tool_use の間ツールを実行して結果を返すループを自分で書くか、SDK のツールランナーに任せます。 | ツールランナー | ツール使用のループ, stop_reason, tool_result | 1.2 | A | Tool runner (SDK)・Handle tool calls |
| 6-4-2 | `l4-build-and-host/t2-where-to-host` | 動かす場所を選ぶ | エージェントを自分の環境で動かすなら Agent SDK、実行の環境ごと Anthropic に任せるなら Managed Agents を選びます。 | Managed Agents | Agent SDK, エージェント | 1.2 | A | Claude Managed Agents overview(When to use Claude Managed Agents)・Agent SDK overview・Hosting the Agent SDK |

レッスン `l5-long-running`(長く動くエージェント)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6-5-1 | `l5-long-running/t1-clear-tool-results` | 古いツールの結果を消す | 長く動くエージェントでは、使い終わったツールの結果をコンテキストの編集で消して、枠を空けます。 | ツールの結果の消去 | コンテキストの編集, tool_result, コンテキストウィンドウ | 6.1 | B | Context editing(Tool result clearing) |
| 6-5-2 | `l5-long-running/t2-memory-tool` | 会話をまたいで覚えさせる | 次の会話でも使いたい情報は、メモリーツールでファイルに書かせ、次の会話で読ませます。 | メモリーツール | ツール, セッション | 1.3 | A | Memory tool(How it works / Security considerations) |
| 6-5-3 | `l5-long-running/t3-other-frameworks` | ほかの枠組みで作る | Strands・LangGraph・PydanticAI などの枠組みでも Claude のエージェントを作れますが、裏で何をしているかを確かめてから使います。 | Strands, LangGraph, PydanticAI | フレームワーク, エージェント | 1.3 | A | Building effective agents(When and how to use frameworks)。各フレームワークの公式ドキュメント(他社の資料。台帳への登録は要相談) |

#### M7 に足す

レッスン `l3-guardrails`(守りを重ねる)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7-3-1 | `l3-guardrails/t1-layered-defense` | 1 つの対策に頼らない | 入力のふるい分け・権限の絞り込み・出力の確認・人の承認を重ね、1 つが破られても被害が出ないようにします。 | ガードレール, 多層の防御 | ふるい分け, 最小権限, 承認 | 7.2 | A | Securely deploying AI agents(Security principles)・Mitigate jailbreaks and prompt injections |
| 7-3-2 | `l3-guardrails/t2-content-policy` | 使い方の決まりを守る | 作るアプリは Anthropic の利用規定に沿わせ、規定に触れる入力と出力を見分ける仕組みを入れます。 | 利用規定, コンテンツモデレーション | ふるい分け | 7.2 | B | Content moderation。利用規定(Usage Policy)の台帳への登録は要相談 |
| 7-3-3 | `l3-guardrails/t3-personal-data` | 個人情報を送りすぎない | 個人情報は処理に要る分だけを送り、ログや応答に残さないようにします。 | 個人情報 | リクエスト, 応答 | 7.1 | A | API and data retention・Securely deploying AI agents(個人情報を扱う節があるか書く前に確かめる) |
| 7-3-4 | `l3-guardrails/t4-prompt-leak` | system の中身を漏らさない | system には漏れて困る情報を書かず、そのうえで中身を明かさないよう指示します。 | プロンプトの漏えい | system | 7.1 | B | Reduce prompt leak(Before you try to reduce prompt leak / Strategies to reduce prompt leak) |

レッスン `l4-keys`(鍵と使い道の管理)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7-4-1 | `l4-keys/t1-workspaces` | 環境ごとに鍵を分ける | 開発と本番でワークスペースと API キーを分け、ワークスペースごとに使える量の上限を決めて見張ります。 | ワークスペース | API キー, レート制限 | 7.4 | A | Workspaces(Environment separation / Workspace limits / Usage and cost tracking) |
| 7-4-2 | `l4-keys/t2-rotate-keys` | 漏れた鍵はすぐ止める | 鍵が漏れたら、すぐに無効にして新しい鍵に替え、その鍵の使われ方を確かめます。 | 鍵のローテーション | API キー, ワークスペース | 7.4 | B | Get your Claude API key・API Keys(Admin API)。漏れたときの手順を書いた節は書く前に確かめる |
| 7-4-3 | `l4-keys/t3-workload-identity` | 長く使える鍵を置かない | クラウドで動く処理は、Workload Identity Federation で短い期限のトークンを受け取り、長く使える鍵を置かないようにします。 | Workload Identity Federation, アクセストークン | API キー, Authorization | 7.4 | B | Workload Identity Federation・API overview(Authentication) |

#### M8 に足す

今のレッスン `l1-claude-code` の末尾に足すトピック

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8-1-4 | `l1-claude-code/t4-block-destructive` | 取り消せない操作を止める | ファイルの削除のような取り消せない操作は、PreToolUse のフックで実行の前に止めます。 | — | フック, PreToolUse | 7.3・1.2 | A | Automate actions with hooks・Intercept and control agent behavior with hooks(Agent SDK) |

レッスン `l3-operate-claude-code`(Claude Code を動かす)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8-3-1 | `l3-operate-claude-code/t1-instruction-files` | 約束の置き場所を分ける | 毎回効かせる約束は CLAUDE.md に短く、ファイルの種類ごとの約束は .claude/rules/ に、ときどき使う手順は Skills に分けて置きます。 | .claude/rules | CLAUDE.md, Skills | 3.1・2.6 | A | How Claude remembers your project(How CLAUDE.md files load / Organize rules with .claude/rules/)・Extend Claude Code(Compare similar features) |
| 8-3-2 | `l3-operate-claude-code/t2-headless` | 画面なしで動かす | claude -p で Claude Code を画面なしで動かし、スクリプトや CI に組み込みます。 | ヘッドレスモード | Claude Code | 3.1 | A | Run Claude Code programmatically(Basic usage / Get structured output / Stream responses) |
| 8-3-3 | `l3-operate-claude-code/t3-permission-modes` | 確認の仕方を選ぶ | 権限のモードで、操作ごとに確認するか、編集だけ任せるか、計画だけさせるか、分類器が判断する auto mode にするかを選びます。 | 権限のモード, plan mode, auto mode | permissionMode, Claude Code | 3.1 | A | Choose a permission mode(Available modes / Eliminate permission prompts with auto mode) |
| 8-3-4 | `l3-operate-claude-code/t4-session-hygiene` | 仕事ごとに会話を分ける | 関係のない仕事は /clear か新しいセッションで始め、続きの仕事は --resume で前の会話から再開します。 | /clear | セッション, resume, コンテキストの劣化 | 2.5・3.1 | A | Manage sessions・Best practices for Claude Code |

レッスン `l4-app-design`(アプリの設計と構成の管理)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8-4-1 | `l4-app-design/t1-surfaces` | 面ごとに前提が違う | claude.ai・Claude Code・API・Agent SDK では最初から入っている指示が違うので、同じプロンプトでも結果が変わることがあります。 | claude.ai, 面 | system, Claude Code, Agent SDK, Messages API | 2.5 | A | Modifying system prompts(Agent SDK)・System prompts(リリースノート)・Extend Claude Code |
| 8-4-2 | `l4-app-design/t2-plugins` | 設定をまとめて配る | Skills・フック・MCP サーバーをチームで配るときは、プラグインにまとめて版と依存を管理します。 | プラグイン, マーケットプレイス | Skills, フック, MCP サーバー | 2.5・2.6 | A | Plugins overview・Plugin dependencies |
| 8-4-3 | `l4-app-design/t3-pin-versions` | 動かす条件を固定する | 本番では、モデル ID・API の版・プロンプト・プラグインの版を固定し、変えるときは評価のセットを通してから切り替えます。 | 版の固定 | モデル ID, API の版, プラグイン, 評価のセット | 2.6 | A | Model IDs and versioning・Versions・Plugin dependencies |

レッスン `l5-debugging`(失敗の出どころを探す)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8-5-1 | `l5-debugging/t1-trace` | 記録をたどる | 失敗は、リクエスト・応答・ツールの呼び出しの記録を順にたどり、どこで想定から外れたかを探します。 | トレース | request ID, ツール使用のループ | 4.1 | A | Hosting the Agent SDK(Observability)・Tool runner(Debugging tool execution)・Claude API errors(Request ID) |
| 8-5-2 | `l5-debugging/t2-integration-or-model` | 統合か、モデルの出力か | HTTP のエラーや形の誤りは統合の側、エラーのない応答の中身の誤りはモデルの出力の側として、直す場所を分けます。 | 統合の層 | トレース, HTTP ステータス, stop_reason | 4.1 | A | Claude API errors・Stop reasons and fallback(Stop reasons versus errors)・Troubleshooting tool use |

レッスン `l6-dev-practices`(Claude と進める開発)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires | サブ項目 | 優先 | 確かめる公式ページ(候補、台帳には未登録) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8-6-1 | `l6-dev-practices/t1-review-before-merge` | 差分を見てから取り込む | Claude に書かせた変更もブランチに分け、差分のレビューとテストを通してから取り込みます。 | コードレビュー | Claude Code | 2.4 | A | Best practices for Claude Code(Give Claude a check to run / Review against your spec) |
| 8-6-2 | `l6-dev-practices/t2-large-refactor` | 大きな書き換えを分ける | 大きなリファクタリングは、plan mode で計画を立ててから小さな単位に分け、単位ごとにテストを通します。 | リファクタリング | plan mode, コードレビュー | 2.4 | B | Best practices for Claude Code・Set up Claude Code in a monorepo or large codebase |

### 今のトピックの改訂(案)

本文を書くときに一緒に直します。

- 4-1-2「例で形を伝える」: zero-shot・one-shot・multi-shot の呼び名を足す(introduces に zero-shot, one-shot, multi-shot を足す。takeaway は変えない)。5.1
- M8 の単元名: 「Claude Code の設定と評価・デバッグ」を「Claude Code・アプリの設計と評価・デバッグ」にする(`stage.json` の `modules`。全単元の内容指紋に入るかを確かめ、本文と同じ変更で直す)
- M9 の模擬試験と M10 のドリル: 複数選ぶ問題の文を「すべて選んでください」から「2 つ選んでください」のように正解の数を書く形にする(本番は選ぶ数が問題文に書かれる。試験ガイド v1.0 §5)
- M9 のまとめ: 「53 問は第三者の解説による本番の問題数で、公式の数字ではない」を、試験ガイド v1.0 の数に直す
- M0: 試験の形式・合格点と成績表・更新・再受験を、上の「試験の前提」の表に合わせる(0-1-3 ほか)
- 10-4-1「場面の条件を読む」: 試験ガイド v1.0 のサンプル問題が場面を読んで選ぶ問題であることを、断定してよいかを講師と決める

### 課題の案

課題はどれも今までと同じく `node-test-01` で、API キーなしで解ける形にします。

| 単元 | 課題(案) | 種別 | 優先 | 扱うサブ項目 |
| --- | --- | --- | --- | --- |
| M1 | HTTP のリクエストを組み立てる(エンドポイント・ヘッダー・JSON の本文を返す関数) | 基礎 | A | 5.2・2.4 |
| M4 | 応答を検証して分岐する(読めない JSON・欠けた項目・拒否を分ける) | 自力 | A | 6.3 |
| M10 | 総合課題: 1 つのアプリを通す(system とツールのループ・エラーの扱い・出力の検証・外の文章の扱い・評価のケース) | 総合 | A | 試験ガイド v1.0 §7 の準備のすすめ |
| M2 | 同時に送る数を絞って並べて送る | 自力 | B | 2.4 |
| M5 | 取り消せない操作のツールに承認を挟む | 自力 | B | 8.1・7.2 |
| M8 | 記録から失敗の出どころを分ける | 自力 | B | 4.1 |

### 時間の案

| 単元 | 今 | 見直し後(案) | 足すもの |
| --- | --- | --- | --- |
| M0 | 1h | 1h | — |
| M1 | 5h | 6h | 1-4・1-5、課題 1 |
| M2 | 5h | 6h | 2-5・2-6 |
| M3 | 5h | 6h | 3-4・3-5 |
| M4 | 4h | 5h | 4-4、課題 1 |
| M5 | 4h | 6h | 5-4・5-5 |
| M6 | 5h | 6h | 6-4・6-5 |
| M7 | 3h | 4h | 7-3・7-4 |
| M8 | 2h | 6h | 8-1-4・8-3〜8-6 |
| M9 | 3h | 3h | 配分の見直しだけ |
| M10 | 3h | 5h | 総合課題 |
| 計 | 40h | 54h | 優先 B を入れると 56h 前後 |

### M9 の模擬試験の配分(案)

ドメインごとの数(17・9・8・6・6・4・2・1)は変えず、ドメインの中をサブ項目の配点で最大剰余法で割り振ります。

| ドメイン | 問題数 | サブ項目ごと(案) | 今 |
| --- | --- | --- | --- |
| Applications and Integration | 17 | 2.1: 2・2.2: 1・2.3: 4・2.4: 4・2.5: 4・2.6: 2 | 17 問とも M1・M2(2.3) |
| Model Selection and Optimization | 9 | 5.1: 3・5.2: 3・5.3: 1・5.4: 2 | 9 問とも M3(5.3・5.4) |
| Agents and Workflows | 8 | 1.1: 2・1.2: 3・1.3: 3 | M6 |
| Prompt and Context Engineering | 6 | 6.1: 2・6.2: 3・6.3: 1 | M4 |
| Tools and MCPs | 6 | 8.1: 3・8.2: 1・8.3: 2 | M5 |
| Security and Safety | 4 | 7.1: 2・7.2: 1・7.3: 0・7.4: 1 | M7 |
| Claude Code | 2 | 3.1: 2 | M8 |
| Eval, Testing, and Debugging | 1 | 4.1: 1 | M8 |

### 今の本文に響きうる公式の変更(2026-11-07 に見つけたもの)

- API の版 `2026-10-21`(Migrating to API version 2026-10-21): SDK と CLI は API キーを `Authorization: Bearer` で送る(`x-api-key` は互換で使える)。`temperature`・`top_p`・`top_k` を送ると 400。`assistant` の発言に直接置いた `document` ブロックは 400。`user` の発言の `citations` は 400。SDK のツールランナーからクライアント側の圧縮が外れた。→ 1-2-2・2-4-2・4-3-3 と、足す 1-4-2・1-5-2・6-4-1 を確かめる
- Thinking: 今のモデル(Opus 5.5・Sonnet 5.5・Haiku 5.5・Fable 5.1・Mythos 5.1)は adaptive thinking で動き、`enabled` と `budget_tokens` の指定は 400 になる。→ 3-3-2 を確かめる
- Models overview: 迷ったら Opus 5.5 から始め、難しい推論や長い作業は Fable 5.1 を使うとある。→ 3-1-1〜3-1-4 と、足す 3-4-1 を確かめる

11-17 以降の改訂で、まとめて確かめます。

### 進め方

1. 2026-11-07: この節の設計を書く(本文は書かない)
2. 2026-11-17 以降: 講師が新しい試験ガイドを確かめる → 上の「サブ項目ごとの対応」と足すトピックを直す → 優先 A の本文・知識問題・課題を書く → M9・M10 を直す → 使った資料を台帳に `draft` で登録し、講師が確かめる → 改訂した単元の `unitId` の版を上げ、`contentHash` を更新する
3. 12-07 より前に受ける受講者: v1.0 の範囲で受ける。足りないサブ項目は、上の一覧の「確かめる公式ページ」で補うよう案内する

### 参考にした第三者のページ

- CertSafari(https://www.certsafari.com/anthropic/claude-developer-foundations): 個人が運営する無料の練習問題サイトで、Anthropic とは関係がないと明記しています。試験の概要・サブ項目の一覧・練習問題 500 問(無料のサンプル 35 問)・本番と同じ 53 問 120 分の模試・サブ項目ごとの解説 25 本・受験記があり、ガイドの版は v1.0(2026-10-30 に確認)・問題の更新は 2026-11-01 とあります。試験ガイドの PDF へのリンクもここにありました。
- 使い方: 出題の傾向をつかむ参考にとどめ、本文の根拠にしません。問題と解説は写しません(上の「公式の情報源」の方針どおり)。サンプル問題には、Strands・LangGraph・PydanticAI の比較や PreCompact フックのように、今の教材より細かいところを問うものがあります。

## 公式の情報源(確認日 2026-10-31)

本文の根拠にする公式の資料です。表の資料はすべて `sources/registry.json` に登録済みで、
2026-10-31 に HTTP 200 と「読む節」の見出しがページにあることを、週次のリンク確認と同じ照合で確かめました。
「読む節」はページの見出しの表記です。M9 の模擬試験と M10 のドリル(10-3)は、問題の解説で M1〜M8 の資料を使います
(表の「使う単元」には書きません)。

| 区分 | 資料 | 読む節 | 使う単元 |
| --- | --- | --- | --- |
| Messages API | [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) | Basic request and response / Multiple conversational turns | M0・M1 |
| | [Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) | Stop reason values / Best practices for handling stop reasons | M0・M1・M10 |
| | [Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)(一覧とエラーの節) | Quick reference / Stop reasons versus errors | M10 |
| | [Claude API errors](https://platform.claude.com/docs/en/api/errors) | HTTP errors / SDK error types / Request ID | M0・M2・M10 |
| | [Rate limits](https://platform.claude.com/docs/en/api/rate-limits) | About rate limits / Response headers | M2 |
| | [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) | Streaming with SDKs / Event types | M0・M2・M10 |
| | [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) | How the Message Batches API works / Pricing | M0・M2・M3・M10 |
| | [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)(system の節) | System role in messages | M1 |
| | [Messages(API リファレンス)](https://platform.claude.com/docs/en/api/messages) | Create a Message | M1 |
| | [TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript) | Usage / Retries | M1・M10 |
| | [Get your Claude API key](https://platform.claude.com/docs/en/get-api-key) | Use your API key | M1 |
| | [Model IDs and versioning](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions) | Model ID format / Dateless IDs are pinned snapshots | M1 |
| | [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) | What a refusal looks like | M1 |
| | [Claude API errors](https://platform.claude.com/docs/en/api/errors)(Long requests の節) | Long requests | M2 |
| | [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming)(差分と finalMessage の節) | Content block delta types / Get the final message without handling events | M2 |
| | [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)(使い方の節) | Prepare and create your batch / Retrieving batch results | M2 |
| | [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)(キャッシュとの組み合わせの節) | What can be batched / Using prompt caching with Message Batches | M10 |
| | [Files API](https://platform.claude.com/docs/en/build-with-claude/files) | How the Files API works / How to use the Files API | M2 |
| | [Vision](https://platform.claude.com/docs/en/build-with-claude/vision) | Send images to Claude | M2 |
| | [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) | Process PDFs with Claude | M2 |
| | [Features overview](https://platform.claude.com/docs/en/build-with-claude/overview) | Platform features / Messages API features | M0 |
| モデルと費用 | [Choosing the right model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model) | Establish key criteria / Combine models | M0・M3 |
| | [Choosing the right model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model)(始め方と比べ方の節) | Choose the best model to start with / Decide whether to upgrade or change models | M3 |
| | [Optimizing for cost and intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) | Start here / Combine models | M3・M6 |
| | [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | How prompt caching works / Pricing | M0・M3・M10 |
| | [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)(区切りと usage の節) | Explicit cache breakpoints / Caching strategies and considerations | M3 |
| | [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) | How effort works / Recommended effort levels | M0・M3 |
| | [Effort](https://platform.claude.com/docs/en/build-with-claude/effort)(書き方と考える過程の節) | Set the effort level / Effort with thinking | M3 |
| | [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting) | How to count message tokens / Pricing and rate limits | M3 |
| | [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) | How thinking works / Configuring thinking / Thinking and effort | M3 |
| | [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)(ツール使用の節) | Thinking with tool use / Preserving thinking blocks | M10 |
| | [Reducing latency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency) | How to measure latency / How to reduce latency | M3 |
| プロンプトとコンテキスト | [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) | General principles / Output and formatting | M0・M4 |
| | [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) | How the context window works / Manage context with compaction | M0・M4 |
| | [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)(大きさと超えたときの節) | Context window sizes by model / Context window overflow behavior | M4 |
| | [Compaction overview](https://platform.claude.com/docs/en/build-with-claude/compaction) | Choose how to compact | M4 |
| | [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) | Why use structured outputs / How it works | M0・M4 |
| | [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)(スキーマの書き方と注意の節) | Using a raw JSON schema / Important considerations | M4 |
| | [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)(一緒に使う節) | Using both features together / Feature compatibility | M10 |
| | [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) | The anatomy of effective context / Context retrieval and agentic search | M0・M4 |
| ツールと MCP | [Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) | How tool use works / Choose a tool | M0・M5 |
| | [Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)(ツールを使う場面の節) | When Claude uses tools | M5 |
| | [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) | Specifying client tools | M0・M5 |
| | [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)(説明と tool_choice の節) | Best practices for tool definitions / Forcing tool use | M5 |
| | [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) | Why strict tool use matters for agents / How it works | M5・M10 |
| | [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) | Handling results from client tools / Handling results from server tools | M0・M5・M7・M10 |
| | [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)(エラーの節) | Handling errors with is_error | M5・M10 |
| | [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) | Key features / Limitations | M0・M5・M10 |
| | [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)(書き方の節) | MCP server configuration / MCP toolset configuration / Response content types | M5 |
| | [Writing effective tools for agents — with agents](https://www.anthropic.com/research/writing-tools-for-agents) | Principles for writing effective tools | M0・M5 |
| | [Connect to external tools with MCP(Agent SDK)](https://code.claude.com/docs/en/agent-sdk/mcp) | Add an MCP server / Allow MCP tools / Transport types | M5・M7・M10 |
| | MCP の仕様(modelcontextprotocol.io) | — | 使わない。**執筆環境から届かないため未確認**。M5 の MCP の説明は、上の Anthropic・Claude Code の資料の範囲で書いた |
| エージェント | [Building effective agents](https://www.anthropic.com/research/building-effective-agents) | When (and when not) to use agents / Building blocks, workflows, and agents | M0・M6・M10 |
| | [Building effective agents](https://www.anthropic.com/research/building-effective-agents)(定義・組み合わせ・まとめの節) | What are agents? / Combining and customizing these patterns / Summary | M6・M10 |
| | [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) | Compare the Agent SDK to other Claude tools / Capabilities | M0・M6 |
| | [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop) | The loop at a glance / Tool execution | M0・M6 |
| | [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop)(止める条件と結果の節) | Turns and budget / Handle the result | M6 |
| | [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents) | Benefits of using subagents / What subagents inherit | M0・M6 |
| | [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents)(作り方と呼び方の節) | Create subagents / Invoke subagents | M6 |
| | [Work with sessions](https://code.claude.com/docs/en/agent-sdk/sessions) | Choose an approach / Use session options with query() / Resume across hosts | M6 |
| 安全性 | [Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks) | Jailbreaks and direct prompt injection / Indirect prompt injection | M0・M7 |
| | [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) | Basic hallucination minimization strategies | M0・M7 |
| | [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)(進んだ方法の節) | Advanced techniques | M7 |
| | [Configure permissions(Agent SDK)](https://code.claude.com/docs/en/agent-sdk/permissions) | How permissions are evaluated / Permission modes | M0・M7 |
| | [Configure permissions(Agent SDK)](https://code.claude.com/docs/en/agent-sdk/permissions)(許可と禁止の節) | Allow and deny rules | M7 |
| | [Configure permissions(Claude Code)](https://code.claude.com/docs/en/permissions) | Permission rule syntax / Tool-specific permission rules | M7 |
| | [Securely deploying AI agents](https://code.claude.com/docs/en/agent-sdk/secure-deployment) | Threat model / Security principles / Credential management | M7 |
| Claude Code | [How Claude remembers your project](https://code.claude.com/docs/en/memory) | CLAUDE.md vs auto memory / CLAUDE.md files | M0・M8 |
| | [Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide) | What you can automate / How hooks work | M0・M8 |
| | [Settings files and precedence](https://code.claude.com/docs/en/settings) | Settings files and who they affect / Settings precedence | M8 |
| 評価とデバッグ | [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) | Define your success criteria / Build evaluations | M0・M8 |
| | [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)(採点の節) | Grade your evaluations | M8 |
| | [Troubleshooting tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/troubleshooting-tool-use) | Claude calls the wrong tool / Claude invents tool parameters | M0・M8 |
| 試験の制度 | [Four role-based certifications …](https://claude.com/resources/articles/four-role-based-claude-certifications)(2026-07-23) | The four credentials / How the exams work / How to find an exam or learn more about the Claude Partner Network | M0・M10 |
| | [Introducing the Services Track and Partner Hub …](https://www.anthropic.com/news/services-track-partner-hub)(2026-06-03) | About the Services Track | M0 |

- ドキュメントは更新型です。本文は、ページの見出しの範囲で考え方を中心に書きます。モデル名・料金・上限の数字は、確認日(2026-10-31)の公式ドキュメントで確かめた値だけを書き(M2 以降)、課題では単価や上限を引数で受け取って教材に固定しません。数字を書いたページは、確認日を更新するときに見直します
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
| M10 `m10-final-review` | 直前対策(紛らわしい機能の切り分け・範囲別のドリル・受験の準備と当日・確認A) | 3h | 全体 |

## takeaway 一覧

ID の 1 桁目が単元です(M10 は 2 桁)。**M0〜M10 の本文と課題を書いてあります(M9 は模擬試験、M10 は直前対策と確認A)。**
takeaway は公式ドキュメントの見出しの範囲で確かめてから確定しました。試験ガイドが改訂されたら、上の「改訂への備え」の順に見直します。

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

### M3 モデルの選択と費用・速度の調整(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 3-1-1 | `l1-choose-model/t1-criteria` | 選ぶ基準を先に決める | モデルは、性能・速度・費用のどれを優先するかを決めてから選びます。 | モデルの選択, 性能, 速度, 費用 | モデル ID |
| 3-1-2 | `l1-choose-model/t2-evaluate` | 自分の課題で比べる | 候補のモデルは、自分の課題で作った評価のセットで比べます。 | 評価, 評価のセット | モデルの選択, 性能, 費用 |
| 3-1-3 | `l1-choose-model/t3-effort` | かける量を決める | effort で、1 つのモデルが応答にかけるトークンの量を調整します。 | effort, output_config | モデルの選択, トークン, 評価 |
| 3-1-4 | `l1-choose-model/t4-combine` | モデルを組み合わせる | モデルの組み合わせは、1 つのモデルの effort を調整しても足りないときに考えます。 | モデルの組み合わせ, アドバイザー, オーケストレーター | effort, 評価, 費用 |
| 3-2-1 | `l2-prompt-caching/t1-reuse-prefix` | 同じ前半を使い回す | 毎回同じ前半のプロンプトは、プロンプトキャッシュで使い回します。 | プロンプトキャッシュ, cache_control, キャッシュの書き込み, キャッシュの読み込み | リクエスト, system, トークン, 費用 |
| 3-2-2 | `l2-prompt-caching/t2-stable-first` | 変わる部分は後ろに置く | キャッシュは前から一致した部分に効くので、変わる部分は後ろに置きます。 | キャッシュの区切り | プロンプトキャッシュ, cache_control, messages |
| 3-2-3 | `l2-prompt-caching/t3-check-usage` | キャッシュの効きを確かめる | キャッシュが効いたかは、応答の usage の値で確かめます。 | usage, cache_read_input_tokens, cache_creation_input_tokens, input_tokens | プロンプトキャッシュ, 応答, キャッシュの区切り |
| 3-3-1 | `l3-tokens-and-speed/t1-count-tokens` | 送る前に量を数える | 入力のトークン数は、送る前にトークン数を数える API で確かめます。 | トークン数を数える API, countTokens | トークン, リクエスト, SDK, 費用 |
| 3-3-2 | `l3-tokens-and-speed/t2-thinking-limit` | 考える過程も出力に数える | 考える過程のトークンも出力に数えるので、出力の上限は max_tokens で決めます。 | 考える過程, thinking ブロック | effort, max_tokens, コンテンツブロック, 途中で切れた応答 |
| 3-3-3 | `l3-tokens-and-speed/t3-latency` | 応答を速くする | 応答を速くするには、モデル・トークンの量・ストリーミングの 3 つを見直します。 | 遅延, 最初のトークンまでの時間 | 速度, ストリーミング, effort, max_tokens |

書く前の一覧(9 トピック)から、公式ドキュメントに合わせて次を変えました。effort をモデル選びのレッスンへ移し、
組み合わせは「1 つのモデルの effort を調整してから考える」順番として書きました(Optimizing for cost and intelligence の Combine models)。
キャッシュの効きを usage で確かめるトピックを足しました。「考えさせる」は、Claude 5 以降は考える過程が既定で使われるため、
考えた分が max_tokens に数えることと effort・max_tokens の使い分けに書き直しました。「速さが要るとき」は、
公式の 3 つの見直し(モデル・トークンの量・ストリーミング)を 1 つの takeaway にしました。

### M4 プロンプトとコンテキストの設計(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 4-1-1 | `l1-prompting/t1-be-specific` | 具体的に頼む | やってほしいことは、理由を添えて具体的に書きます。 | プロンプト, 指示 | system, messages |
| 4-1-2 | `l1-prompting/t2-examples` | 例で形を伝える | 期待する出力の形は、実際の用途に近く種類の違う例を 3〜5 個示します。 | 例, few-shot | プロンプト, 指示 |
| 4-1-3 | `l1-prompting/t3-xml-tags` | タグで区切る | 指示・資料・例は、それぞれ XML のタグで包んで区切ります。 | XML タグ | 指示, 例 |
| 4-1-4 | `l1-prompting/t4-long-documents` | 長い資料は先に置く | 長い資料はプロンプトの先頭に置き、質問は最後に書きます。 | 長い資料 | XML タグ, 指示 |
| 4-2-1 | `l2-output-format/t1-structured-outputs` | 決まった形の JSON | 決まった形の JSON が要るときは、構造化出力でスキーマを渡します。 | 構造化出力, JSON スキーマ | output_config, コンテンツブロック, 指示 |
| 4-2-2 | `l2-output-format/t2-check-before-parse` | 止まった理由を先に見る | 構造化出力の応答は、stop_reason を確かめてから JSON として読みます。 | スキーマに合わない出力 | 構造化出力, stop_reason, refusal, 途中で切れた応答 |
| 4-2-3 | `l2-output-format/t3-say-what-to-do` | してほしい形で頼む | 出力の書き方は、禁止ではなく、してほしい形で指示します。 | 出力の書き方 | 指示, XML タグ |
| 4-3-1 | `l3-context/t1-context-window` | 枠に収める | 入力と出力は、合わせてコンテキストウィンドウに収めます。 | コンテキストウィンドウ, model_context_window_exceeded | system, messages, max_tokens, stop_reason |
| 4-3-2 | `l3-context/t2-high-signal` | 効く情報だけを入れる | コンテキストには、結果に効く情報だけを、できるだけ少なく入れます。 | コンテキスト, コンテキストの劣化 | コンテキストウィンドウ, トークン |
| 4-3-3 | `l3-context/t3-compaction` | 長い会話を縮める | 長い会話は、圧縮で古いやり取りを要約に置き換えて続けます。 | 圧縮, コンテキストの編集 | コンテキストウィンドウ, 会話の履歴, コンテキストの劣化 |

書く前の一覧(8 トピック)から、公式ドキュメントに合わせて次を変えました。長い資料の並べ方(Prompting best practices の
Long context prompting)を足しました。「ツールの入力を守らせる(strict)」は、ツールの定義(`input_schema`・`tool_use`)を
習う前だと読めないので、M5 へ移しました。その代わりに、構造化出力でも `refusal`・`max_tokens` の応答はスキーマどおりとは
限らないこと(Important considerations の Invalid outputs)と、出力の書き方の指示(Output and formatting の
Control the format of responses)を足しました。prefill が Claude 4.6 以降で使えないことは、4-2-1 のまとめに書きました。

### M5 ツール使用と MCP(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 5-1-1 | `l1-tool-loop/t1-app-runs-tools` | ツールを実行するのはアプリ | 自分で定義したツールは、Claude が呼び出しを求め、アプリが実行します。 | ツール, tools, input_schema, tool_use | ツール使用, stop_reason, リクエスト, JSON スキーマ |
| 5-1-2 | `l1-tool-loop/t2-return-results` | 結果を返す | ツールの結果は tool_result にして、次のリクエストの user の発言で返します。 | tool_result, tool_use_id, ツール使用のループ | tool_use, 会話の履歴, end_turn |
| 5-1-3 | `l1-tool-loop/t3-return-errors` | 失敗を返す | ツールが失敗したら、is_error を付けた結果で、何が起きたかを返します。 | is_error | tool_result, ツール使用のループ |
| 5-1-4 | `l1-tool-loop/t4-server-tools` | Anthropic 側で動くツール | サーバーツールは Anthropic の側で実行され、アプリが結果を返す処理は要りません。 | サーバーツール, クライアントツール | ツール, tool_result |
| 5-2-1 | `l2-tool-design/t1-description` | 説明に書くこと | ツールの説明には、何をし、いつ使い、何を返すかを詳しく書きます。 | ツールの説明 | ツール, input_schema |
| 5-2-2 | `l2-tool-design/t2-tool-choice` | ツールを使う場面を決める | ツールを使うかどうかは、tool_choice と system の指示で調整します。 | tool_choice | ツール, system |
| 5-2-3 | `l2-tool-design/t3-strict` | ツールの入力を守らせる | ツールの入力をスキーマどおりにさせるには、strict: true を指定します。 | strict | input_schema, tool_use, JSON スキーマ |
| 5-2-4 | `l2-tool-design/t4-fewer-tools` | ツールは少数にまとめる | 似たツールを並べず、目的ごとに少数のツールにまとめます。 | ツールの名前空間 | ツール, ツールの説明, コンテキスト |
| 5-3-1 | `l3-mcp/t1-what-is-mcp` | 共通の約束でつなぐ | MCP は、ツールやデータを AI のアプリにつなぐための、公開された共通の規格です。 | MCP, MCP サーバー | ツール |
| 5-3-2 | `l3-mcp/t2-mcp-connector` | API から MCP を使う | MCP コネクターを使うと、Messages API からリモートの MCP サーバーのツールを使えます。 | MCP コネクター, mcp_servers, mcp_toolset | MCP サーバー, Messages API, tools |
| 5-3-3 | `l3-mcp/t3-sdk-mcp` | SDK から MCP を使う | Agent SDK では、MCP サーバーを設定に足し、使うツールを allowedTools で許可します。 | mcpServers, allowedTools | Agent SDK, MCP サーバー |

書く前の一覧から、公式ドキュメントに合わせて次を変えました。「ツールを使わせる」(tool_choice で必ず使わせる)は、
Claude Opus 5.5・Claude Sonnet 5.5・Claude Fable 5.1 で `any`・`tool` が 400 エラーになる(Define tools の Forcing tool use)ため、
「ツールを使う場面を決める」(tool_choice と system の指示で調整する)に書き直しました。「Anthropic 側で動くツール」には、
結果を返す処理が要らないことまでを takeaway に入れました。「SDK から MCP を使う」には、MCP のツールは許可するまで使えないこと
(Allow MCP tools)を入れました。MCP の仕様のサイトは執筆環境から届かないため、MCP の説明は Anthropic と Claude Code の
ドキュメントに書かれた範囲にとどめました。

### M6 ワークフローとエージェント(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 6-1-1 | `l1-agentic-systems/t1-who-decides` | 手順を決めるのは誰か | 手順をコードで決める仕組みがワークフローで、手順を Claude に任せる仕組みがエージェントです。 | ワークフロー | エージェント, ツール |
| 6-1-2 | `l1-agentic-systems/t2-start-simple` | 単純な作りから始める | まず単純な作りで試し、効果が確かめられたときだけ複雑にします。 | フレームワーク | ワークフロー, 評価 |
| 6-2-1 | `l2-workflows/t1-chaining` | 段に分けてつなぐ | 大きな処理は、確かめやすい段に分けて順につなぎ、段の間で結果を確かめます。 | プロンプトの連鎖, ゲート | ワークフロー |
| 6-2-2 | `l2-workflows/t2-routing` | 入力で振り分ける | 入力の種類で、扱う指示やモデルを振り分けます。 | ルーティング | ワークフロー, モデルの選択 |
| 6-2-3 | `l2-workflows/t3-parallel` | 並べて同時に処理する | 互いに独立した部分は、並べて同時に処理します。 | 並列化, 分割, 投票 | ワークフロー |
| 6-2-4 | `l2-workflows/t4-orchestrator` | 指揮役が仕事を配る | 分け方が前もって決まらない仕事は、指揮役が分けて配ります。 | 作業役 | オーケストレーター, 並列化 |
| 6-2-5 | `l2-workflows/t5-evaluator` | 評価役に直させる | 評価の基準がはっきりした仕事は、評価役の指摘で直させます。 | 評価役, 生成役 | ワークフロー, 評価 |
| 6-3-1 | `l3-agent-sdk/t1-agent-loop` | エージェントのループ | Agent SDK は、ツールの実行と結果の受け渡しを繰り返すループを持っています。 | query, ResultMessage | Agent SDK, ツール使用のループ |
| 6-3-2 | `l3-agent-sdk/t2-subagents` | サブエージェントに渡す | サブエージェントは自分の会話で動くので、要る情報をプロンプトに書いて渡します。 | サブエージェント | query, コンテキスト |
| 6-3-3 | `l3-agent-sdk/t3-sessions` | 作業を再開する | 続きの作業は、セッションの ID を控えておき、resume で再開します。 | セッション, resume | query, ResultMessage |

書く前の一覧から、公式ドキュメントに合わせて次を変えました。「段に分けてつなぐ」には、段の間のゲート(Building effective agents の
Prompt chaining)を takeaway に入れました。「サブエージェントに渡す」は、親から渡るのが呼び出すときのプロンプトだけ(What subagents
inherit)なので、「プロンプトに書いて渡す」と具体にしました。「作業を再開する」は、ResultMessage の session_id を控えて resume に
渡す(Work with sessions)と具体にしました。オーケストレーターは M3 で導入した語を使い、6-2-4 では作業役を足しました。
Building effective agents は 2024 年 12 月の記事で、冒頭に道具の状況が変わった注記があるため、本文では形と考え方だけを扱いました。

### M7 安全性とセキュリティ(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 7-1-1 | `l1-prompt-injection/t1-untrusted-as-data` | 外の文章は指示ではない | ツールで取った外の文章は、tool_result の中にデータとして入れて渡します。 | プロンプトインジェクション, 信頼できない内容 | tool_result, system |
| 7-1-2 | `l1-prompt-injection/t2-screen-inputs` | 危ない入力をふるい分ける | 危ない入力は、本処理の前に小さいモデルでふるい分けます。 | ふるい分け, ジェイルブレイク | 構造化出力, refusal, プロンプトインジェクション |
| 7-1-3 | `l1-prompt-injection/t3-least-privilege` | 権限を絞る | エージェントが使えるツールと権限は、作業に要るものだけに絞ります。 | 最小権限, permissionMode, disallowedTools | allowedTools, Agent SDK, プロンプトインジェクション |
| 7-2-1 | `l2-reliable-answers/t1-allow-unknown` | 分からないと言わせる | 分からないときは分からないと答えてよい、と指示に書きます。 | ハルシネーション | 指示 |
| 7-2-2 | `l2-reliable-answers/t2-quote-first` | 引用から答えさせる | 長い資料の事実は、先に引用を抜き出させてから答えさせます。 | 根拠の引用 | 長い資料, ハルシネーション |
| 7-2-3 | `l2-reliable-answers/t3-hide-secrets` | 秘密を見せない | API キーなどの秘密はエージェントに渡さず、外側のプロキシで付け足します。 | プロキシ | API キー, エージェント, 最小権限 |

書く前の一覧から、公式ドキュメントに合わせて次を変えました。「外の文章は指示ではない」は、Mitigate jailbreaks and prompt
injections の Indirect prompt injection に合わせ、外の文章を tool_result の中に入れる(JSON にして包む)と具体にしました。タグで包む
だけでは、本文でタグを閉じて抜け出せるためです。「危ない入力をふるい分ける」には小さいモデルを使うことを入れました。「権限を絞る」は
ツールだけでなく権限のモードも絞る(allowedTools はほかのツールを消さない)と書きました。「秘密を残さない」は、プロンプトとログの扱いに
ついての公式の節が見つからなかったため、Securely deploying AI agents の Credential management に合わせて「秘密を見せない」
(外側のプロキシで付け足す)にしました。

### M8 Claude Code の設定と評価・デバッグ(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 8-1-1 | `l1-claude-code/t1-claude-md` | 毎回効かせる約束 | 毎回効かせたいプロジェクトの約束は、CLAUDE.md に短く具体的に書きます。 | CLAUDE.md, 自動メモリー | Claude Code, 指示 |
| 8-1-2 | `l1-claude-code/t2-hooks` | 必ず実行する処理 | 必ず実行したい処理は、CLAUDE.md の指示ではなくフックで決めます。 | フック, PreToolUse, PostToolUse | CLAUDE.md |
| 8-1-3 | `l1-claude-code/t3-settings` | 共有する設定の置き場所 | チームで共有する設定は、プロジェクトの .claude/settings.json に置いてリポジトリに入れます。 | 設定ファイル, 管理された設定 | フック |
| 8-2-1 | `l2-evals/t1-success-criteria` | 成功の基準を先に決める | 作る前に、具体的で測れる成功の基準を決めます。 | 成功の基準 | 評価 |
| 8-2-2 | `l2-evals/t2-compare-evals` | 同じ評価で比べる | プロンプトを変えたら、同じ評価のセットを自動で採点して前と比べます。 | 採点, LLM による採点 | 評価のセット, 成功の基準 |
| 8-2-3 | `l2-evals/t3-tool-misuse` | ツールの誤用を直す | ツールの誤用は、ツールの説明・スキーマ・strict から直します。 | ツールの誤用 | ツールの説明, strict, input_schema |

書く前の一覧から、公式ドキュメントに合わせて次を具体にしました。CLAUDE.md は「短く具体的に」(How Claude remembers your project
の Write effective instructions)、設定は置き場所を `.claude/settings.json` と名指し(Settings files and precedence)、評価は
「自動で採点して」(Define success criteria and build evaluations の Grade your evaluations)、ツールの誤用は strict まで
(Troubleshooting tool use)を takeaway に入れました。フックは、CLAUDE.md が指示として読まれるだけで必ず守られる設定ではない
こと(CLAUDE.md vs auto memory)と対にして書きました。

### M9 模擬試験

- M9(**本文・模擬試験あり**): `m9-mock-exam/l1-mock-exam` に、受け方のトピック 9-1-1「模擬試験で弱点を見つける」
  (takeaway「模擬試験は時間を計って通しで解き、間違えた問題の単元に戻って直します。」、introduces: 模擬試験, 誤答分析 /
  requires: 試験ガイド, 出題範囲)と、自作 53 問の知識問題を持つ。配分は、講師の指示(2026-10-31)で上の配点の比を最大剰余法で
  割り振った: Applications and Integration 17・Model Selection and Optimization 9・Agents and Workflows 8・
  Prompt and Context Engineering 6・Tools and MCPs 6・Security and Safety 4・Claude Code 2・Eval, Testing, and Debugging 1。
  問題は本番のように範囲を混ぜて並べ、正解の位置が偏らないよう選択肢の並びを入れ替えてある(並べ替えは執筆のときに 1 度だけ行った。問題の正本は knowledge.md で、以後は knowledge.md を直接直す)。
  各問の解説に範囲・戻るトピック ID・公式ドキュメントのページを付け、誤答分析に使う。まとめには範囲ごとの問題数を載せ、配点の %
  は載せない。53 問は第三者の解説による本番の問題数で、公式の数字ではないことをまとめに書いた。
  **本番に合わせるのは問題数と時間だけ**で、時間は受講者が自分で計る。本番は日本語でも受験できるので、設問・解説とも日本語で書く

### M10 直前対策(本文・課題あり)

| ID | ディレクトリ | タイトル | takeaway | introduces | requires |
| --- | --- | --- | --- | --- | --- |
| 10-1-1 | `l1-api-distinctions/t1-stream-or-batch` | 待つ人がいるかで選ぶ | 人が応答を待つならストリーミング、急がない大量の処理ならバッチで送ります。 | — | ストリーミング, Message Batches API, バッチの料金, バッチの結果 |
| 10-1-2 | `l1-api-distinctions/t2-cache-and-batch` | 割引を重ねる | キャッシュとバッチの割引は重ねられますが、バッチの中のキャッシュは当たるとは限りません。 | — | プロンプトキャッシュ, cache_control, Message Batches API, バッチの料金 |
| 10-1-3 | `l1-api-distinctions/t3-format-or-strict` | スキーマをかける場所 | 応答の形は構造化出力で、ツールの入力の形は strict で決め、両方を同じリクエストで使えます。 | — | 構造化出力, output_config, strict, tool_use, JSON スキーマ |
| 10-1-4 | `l1-api-distinctions/t4-stop-reason-or-error` | エラーではない止まり方 | stop_reason は成功した応答が止まった理由で、HTTP のエラーとは分けて扱います。 | — | stop_reason, HTTP ステータス, refusal, 途中で切れた応答, 送り直し |
| 10-2-1 | `l2-agent-distinctions/t1-connector-or-sdk` | MCP をつなぐ場所 | 公開された MCP サーバーは MCP コネクターで API から使い、手元で動く stdio のサーバーは Agent SDK でつなぎます。 | — | MCP サーバー, MCP コネクター, mcp_servers, Agent SDK, mcpServers |
| 10-2-2 | `l2-agent-distinctions/t2-workflow-or-agent` | 手順を前もって書けるか | 手順を前もって書ける仕事はワークフローで、柔軟な判断が要る仕事はエージェントで作ります。 | — | ワークフロー, エージェント, プロンプトの連鎖, ルーティング |
| 10-3-1 | `l3-domain-drills/t1-drill-weak-domains` | 弱い範囲を繰り返す | 模擬試験で間違えた範囲のドリルを解き、外した問題は戻るトピックの公式ページで確かめます。 | ドリル | 模擬試験, 誤答分析, 出題範囲, 公式ドキュメント |
| 10-4-1 | `l4-exam-day/t1-read-the-scenario` | 場面の条件を読む | 本番の問題は実際の仕事を映すように作られているので、場面の条件を拾ってから選択肢を比べます。 | 場面の条件 | 認定試験, 出題範囲 |

書く前の一覧から、公式ドキュメントに合わせて次を変えました。切り分けは、API の機能(10-1)とエージェントの作り(10-2)の
2 レッスンに分け、Stop reasons and fallback の Stop reasons versus errors に合わせて「stop_reason とエラー」(10-1-4)を足しました。
確認A で stop_reason の分岐とエラーの扱いを分けて書くためです。比べる 2 つの機能はどちらも導入済みなので、切り分けのトピックは
新しい語を導入しません(タイトルに「と」を入れず、選ぶ条件を題にしました)。「キャッシュとバッチ」は、Batch processing の
Using prompt caching with Message Batches に合わせ、バッチの中ではキャッシュが当たるとは限らないことまでを takeaway に入れました。
「構造化出力と strict」は、Structured outputs の Using both features together に合わせ、同じリクエストで両方を使えることを入れました。
ドリルは範囲ごとに 3 問(計 24 問)で、配点の小さい範囲も埋められるよう数をそろえました(本番の配分に近いのは M9)。
受験の手続き(受験資格・監督と本人確認・デジタルバッジ)は M0 で扱ったので、10-4 はトピックを場面の読み方の 1 つにし、
まとめに申し込みの前と当日に確かめることの一覧(M0 への戻り先つき)を置きました。公式の発表で試験の作り方として書かれているのは
「専門家が作り、実際の仕事を映す内容にした」ことまでなので、問題の形式(場面の問題か)は本文に断定して書いていません。

## 手を動かす課題

各単元に、VS Code 拡張の「STELLA: 課題を確認する」で確かめる課題を置きます(runner は `node-test`、環境は `node-test-01`)。
ひな形は `templates/runners/node-test/` で、テスト(Vitest)・ESLint・Prettier を拡張と同じ固定の手順で動かします。

- **API キーなしで解ける形にする。** 受講者の関数は Claude のクライアントを引数で受け取り、テストは Messages API の応答の形
  (content のブロック・stop_reason・usage など)を返す偽のクライアントを渡す。偽のクライアントは `tests/` に置き、`protected` にする
- 応答の形は公式ドキュメント(Using the Messages API・Handle tool calls・Streaming messages など)の例に合わせ、課題文に出典を付ける
- 本物の API で試すのは任意の発展とし、課題文の末尾に書くだけにする(費用がかかるため完走条件にしない)
- 種別ごとのヒント・解答例の出し方は ADDING_STAGE.md の表に従う。基礎はヒント 2 段、自力はヒント 2 段 + 挑戦 5 回で解答例

| 単元 | 課題 | 種別 | 作るもの(テストが確かめること) |
| --- | --- | --- | --- |
| M0 | `q01-study-plan` 配点に合わせて学習時間を配る(**実装済み**) | 基礎 | 配点の合計に対する割合で時間を配り、0.5 時間単位に丸める |
| M1 | `q01-build-messages` 会話の履歴を組み立てる(**実装済み**) | 基礎 | これまでのやり取りと新しい発言から、system と messages を持つリクエストを作り(履歴の配列は書き換えない)、応答のテキストのブロックをつなぐ |
| M1 | `q02-route-stop-reason` 止まった理由で処理を分ける(**実装済み**) | 自力 | stop_reason ごとに、答え・途中で切れた応答・ツールの呼び出し・拒否(表示用の説明)を返し、表にない値は扱いを決めていない値として返す(説明欄あり) |
| M2 | `q01-retry-transient` 送り直せるエラーだけを送り直す(**実装済み**) | 自力 | 429・500・529 だけを、retry-after か倍になる間隔で、上限の回数まで送り直す(待ち時間の関数は引数で受け取る。説明欄あり) |
| M2 | `q02-collect-stream` ストリームから本文を組み立てる(**実装済み**) | 基礎 | イベントの列から text_delta の差分だけをつなぎ、message_delta の stop_reason を返す(知らないイベントは読み飛ばす) |
| M2 | `q03-batch-requests` バッチのリクエストを組み立てる(**実装済み**) | 基礎 | 問い合わせの一覧から custom_id の重ならないリクエストの束を作り、結果を custom_id で引く |
| M3 | `q01-cache-friendly-prompt` キャッシュが効く順に並べる(**実装済み**) | 基礎 | 変わらない指示と資料を system に、変わる時刻と質問を messages に置き、毎回同じ部分の最後のブロックにだけ cache_control を付ける。usage の 3 つの値から入力の合計と、読み込み・書き込み・キャッシュなしを返す |
| M3 | `q02-estimate-cost` 費用を見積もる(**実装済み**) | 自力 | usage の内訳と単価(引数、100 万トークンあたり)から費用を求め、キャッシュの有無(1 回目は書き込み・最低の長さ)とバッチの割引で比べる(説明欄あり) |
| M4 | `q01-tagged-prompt` 指示と資料を分ける(**実装済み**) | 基礎 | 資料・例・指示・質問を XML のタグで包み、資料を先頭・質問を最後に並べたプロンプトを作る。応答からタグの中身を取り出し、なければ null を返す |
| M4 | `q02-extraction-schema` 抽出のスキーマを書く(**実装済み**) | 自力 | すべて必須で、書かれていない値を null と "unknown" で表す JSON スキーマ(使えない制限なし)を書き、構造化出力のリクエストを作り、stop_reason を確かめてから応答を読む。テストは代表の出力が合う・合わないを確かめる(説明欄あり) |
| M5 | `q01-tool-loop` ツール使用のループを回す(**実装済み**) | 自力 | 偽の送信の関数で、tool_use を実行して tool_use_id で結んだ tool_result を 1 つの user の発言で返し、end_turn か maxTurns まで繰り返す。知らないツールは is_error で返す(説明欄あり) |
| M5 | `q02-fix-tool-error` ツールの失敗で止まるのを直す(**実装済み**) | 修正 | 障害の報告とログから、ツールの例外と知らないツールで止まる不具合を、is_error を付けた結果を返す形に直す(修正記録あり。CR-DEBUG-01 は導入が javascript-basics でこのステージの前提にないため任意にし、同じ観点をルーブリックに書いた) |
| M6 | `q01-router` 入力で振り分ける(**実装済み**) | 自力 | 分類の結果の空白・大文字と小文字・末尾の句読点をそろえ、種類ごとのモデル・指示・上限で答えさせる。当てはまらない分類は fallback に回し fellBack で示す(説明欄あり) |
| M6 | `q02-chain-with-gate` 段に分けてつなぐ(**実装済み**) | 自力 | 段の出力をゲートで確かめ、条件を満たさないか例外なら次の段へ進まずに止まった段と理由を返す。retries の回数まで、ゲートの理由を feedback にしてやり直す(説明欄あり) |
| M7 | `q01-wrap-untrusted` 外の文章をデータとして渡す(**実装済み**) | 基礎 | ツールで取った内容を出どころと一緒に JSON にして tool_result に入れ(タグで包まない)、アプリの指示は tool_result のあとの text ブロックで渡す |
| M7 | `q02-least-privilege` 要るツールだけを許可する(**実装済み**) | 自力 | 作業の種類から allowedTools を最小にし(Bash は npm test だけ、MCP は名前で 1 つずつ)、dontAsk と、Bash の要らない作業では disallowedTools の Bash でほかを断る(説明欄あり) |
| M8 | `q01-eval-compare` 評価のセットで比べる(**実装済み**) | 自力 | 評価のケースをすべて回してコードで採点し合格率を出す(生成の失敗は不合格として残す)。同じセットの前後を比べ、合格率の差と、悪化したケース・直ったケースを返す(説明欄あり) |
| M10 | `q01-support-assistant` 問い合わせに答えるアシスタント(**実装済み**) | 確認A | strict を付けたツールと構造化出力を毎回のリクエストに入れ、送り直しは `create` の第 2 引数の `maxRetries` で SDK に任せる。tool_use なら thinking ブロックを含む content をそのまま返してツールを実行し(知らないツール・例外は is_error)、stop_reason ごとに答え・拒否・切れた応答・扱いを決めていない値を返す。maxTurns で止め、429・500 以上は重ねて送り直さずに返し、それ以外のエラーは投げる(ヒント 0 段・解答例は合格後。説明欄あり) |

M1〜M8 の課題は、リクエスト・応答・イベント・結果・usage・権限の設定・評価のケースの形をした値や、偽の送信・分類・段・生成の関数を扱う関数なので、クライアントは使いません。M10 の確認Aだけが `client.messages.create(本文, 設定)` の形のクライアントを受け取り、テストは SDK が送り直したあとの結果を返す偽のクライアント(`tests/fake-client.js`)を渡します。

確認Aの「送り直し」は、書く前の一覧では自分で送り直す処理を想定していましたが、M1(1-2-1)と M2(2-1-2)で「送り直しは SDK に任せ、足りるかを先に考える」と教えたので、リクエストごとに `maxRetries` を渡し、SDK が送り直したあとのエラーをアプリで重ねて送り直さない形にしました。ツール使用で thinking ブロックを返すこと(Thinking の Preserving thinking blocks)も、Claude 5 のモデルが考える過程を既定で使うため(3-3-2)、仕様に入れました。

## 決めていないこと(講師と相談)

- 2026-11-17 に出るとされる新しい試験ガイドへの追従(上の「改訂への備え」と「試験ガイド v1.0 での見直し」)
- 試験ガイド v1.0 の PDF が Partner Academy のものと同じか。同じなら、受講者向けの本文に配点を書くかを決める
- 優先 B のトピックと課題を入れるか
- 他社の資料(各フレームワークの公式ドキュメント・MDN・利用規定)を台帳に登録してよいか
- 予定時間を 54 時間前後に増やすか(上の「時間の案」)

## クレジット(原典)

このステージは、公式ドキュメントと Anthropic の記事を **材料として参照し、社内エンジニア向けに順序・粒度を組み直した独自教材**です。
翻訳・転載ではなく、本文・図解・知識問題はすべて自作します。資料と使用箇所の対応は単元の `references.json` に記録し、
各トピック・まとめ・知識問題の出典表示はそこから生成します。

- 公式ドキュメントの文章・図・コード例はそのまま使いません。コード例は教材用に書きます
- 試験ガイド・準備の講座・サンプル問題は Partner Academy の利用条件の下にあるので、教材に写しません
- Claude / Claude Code / Agent SDK / MCP は製品名・仕様名として本文で使います。公式のロゴは使いません
