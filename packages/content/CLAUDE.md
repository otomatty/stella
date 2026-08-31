# CLAUDE.md

このディレクトリでClaude Codeが作業する際の指針です。作業開始前に必ず読んでください。

## このディレクトリは何か

社内の**未経験エンジニア向けTypeScript研修教材**です。動画講義(ショート動画)とLMS掲載用のドキュメントの2本立てです。

この教材は `falcon-informal` の LMS に配信されます。`packages/content` がその正本で、スライド・ドキュメント・演習はここで書き、LMS へは seed で投入します。講座は `courses/<slug>/` 単位で、**新しい講座を足すのが既定の手順**です（[ADDING_COURSE.md](ADDING_COURSE.md)）。

原典は [サバイバルTypeScript](https://typescriptbook.jp/)(CC BY-SA 4.0)ですが、**未経験者向けに順序・粒度を再設計した独自教材**であり、原典の翻訳や写しではありません。

## 教材の単位(3層)

粒度の定義がこの教材の設計の中心です。**モジュール / レッスン / トピック**の3層で構成します。

| 層 | 定義 | 目安 | 成果物 |
| --- | --- | --- | --- |
| モジュール | 大テーマ | 全10モジュール(M0〜M9) | — |
| レッスン | LMSの1回分・演習の単位 | 3〜5トピック | `doc.md` / `practice.md` |
| **トピック** | **ショート動画1本 = 覚えることが1つ** | 2〜3分 / 4〜6スライド | `slides.md` |

**トピック分割の唯一の判定基準は「Takeaway が1文で書けること」**です。書けなければ2つに割ってください。タイトルに「と」が入ったら分割のサインです。

## ディレクトリ構成

講座は `courses/<slug>/` が単位。新しい講座を足すのが既定の手順で、詳細は [ADDING_COURSE.md](ADDING_COURSE.md)。

```
packages/content/courses/<slug>/
├── course.json     # タイトル・説明・セクション名
└── modules/<モジュールID>/<レッスンID>/
    ├── <トピックID>/
    │   ├── slides.md   # 動画1本ぶんのスライド(必須)
    │   └── assets/     # そのトピック専用の図解(正本は.html、.svgはビルドで生成)
    ├── doc.md          # LMSドキュメント(トピックと1:1の見出しを持つ)
    └── practice.md     # ハンズオン・演習・クイズ
packages/content/templates/     # 新規作成用の雛形
packages/content/STYLE_GUIDE.md # 執筆ルール(文体・コード例・図解・構成)
```

例: `packages/content/courses/typescript-basics/modules/m1-values/l1-variables/t2-const-and-let/slides.md`

## 語彙台帳 — 前後関係は検査で守る

各トピックの `slides.md` は front-matter に**語彙台帳**を持ちます。

```yaml
---
id: 1-1-2
title: constとletの違い
takeaway: "constは再代入できない、letはできる"
introduces: [const, let, 再代入]   # このトピックで新しく導入する語
requires: [変数, 宣言, 代入]        # 前提として必要な語
header: "TypeScript入門"
---
```

`packages/content/scripts/check_vocab.mjs` が、トピックをパス順(= 学習順)に並べ、**`requires` に「それより前で `introduces` されていない語」があればビルドを落とします**。前後関係は人力レビューではなくこの検査で守ってください。

このパス順は**自然順**です(`src/natural-order.mjs`)。名前の中の数字を数値として比べるので、`m9-...` の次は `m10-...` になります。manifest(LMS のセクション順)・pptx の収録順もこの並びを使います。

- 未導入の語を使いたくなったら、それは**構成の問題**です。語を足すのではなく、トピックの順序を見直してください
- **台帳が見るのは宣言した依存だけ**です。`requires` に書かずにコード例へ未導入の語を混ぜても検出できません。コード例は目視で確認してください

## コマンド

```bash
bun run --filter=@falcon/content materials        # 全トピックを pptx 化
bun run --filter=@falcon/content materials -- courses/typescript-basics/modules/m1-values/l1-variables   # 一部だけ
bun run --filter=@falcon/content check:ci         # 語彙台帳・画像リンク・スライド枚数の検査（CI と同じ）
```

Python 3 と `pip install python-pptx pygments playwright` / `playwright install chromium` が必要。
`bun install` だけでは足りない。

**pptxは差分更新です。** 出力より新しい依存があるトピックだけを作り直します。依存は次の3つで、`-- --force` で無視できます。

- そのトピックの `slides.md`
- そのトピックの `assets/` 配下の全ファイル(`.html` / `.svg` / `.diagram.png` を含む)
- **`scripts/build_pptx.py`** — 見た目の正本なので、触ると全トピックが作り直しになる

`-- --force` はこのpptx側の差分判定だけを無視します。`diagram_export.py` はSVG/PNGそれぞれを自分の出力の新しさだけで判定する独立した仕組みです。図解を強制的に作り直したいときは元の `.html` を編集するか(タイムスタンプが更新される)、`diagram_export.py` 自身を変更してください。

ビルド時、pptxを `packages/content/dist/slides/` にも複製します。出力はすべて `slides.pptx` という同名のため、収録やGoogle Slides等への一括アップロードにはこのフォルダを使ってください。

- ファイル名は **トピックIDを先頭に付けた `1-1-2-const-and-let.pptx` 形式**。`id` は front-matter の値なので、スライド・`doc.md` の見出し・`practice.md` の対象範囲とIDが一致します
- **ファイル名の自然順 = 収録順**です(`10-1-1-...` は `9-...` の後ろ。数字を数値で見ないツールで並べると `1-...` と `2-...` の間に見えます)。IDが衝突するとビルドが落ちます
- 全体ビルド時は `dist/slides/` を作り直します(構成変更で名前が変わった古い出力が残らないように)。対象を指定したプレビュー時は残します

ビルド生成物(`slides.pptx` / `assets/*.diagram.png` / `dist/`)は `.gitignore` 済みです。コミットしないでください。**`assets/*.svg` も生成物ですが、こちらはコミットします**(`slides.md` / `doc.md` が参照する正本のため)。

## 絶対に守るルール

1. **1トピック = 1 Takeaway を崩さない** — スライドを足したくなったら、まずトピックを割れないか考えてください。「関連情報」は Takeaway を強化する枠(図解 or 失敗例)1つだけに収めます。詰め込みは粒度の設計を壊します。
2. **語彙台帳を必ず更新する** — トピックを追加・移動・改稿したら `introduces` / `requires` を更新し、`bun run --filter=@falcon/content materials` で検査を通してください。
3. **クレジット表記を教材本体に入れない** — スライド・ドキュメント本文・講師ノートに「サバイバルTypeScript」等の原典名を書かないでください(LMSドキュメント末尾の「もっと知りたい人へ」の参考リンクは例外として可)。集約先は**講座ごとの `CURRICULUM.md`** です(SQL 入門・HTML/CSS 入門・基本情報の各講座)。TypeScript 入門だけは歴史的経緯で `README.md` に置いています。
4. **`STYLE_GUIDE.md` に従う** — 文体、コード例の書き方、構成のルールがすべて定義されています。新規作成・修正の前に読んでください。
5. **図解は `.claude/skills/diagram-design/` の規約に従う** — 型を選び、テンプレートから作り、出力前チェックリストを通してください。配色・寸法の正本は `references/style-guide.md` です。

## 変更時の検証

スライドを編集したら、必ずビルドが通ることを確認してください。次の6つが自動で検査されます。

| 検査 | 守るもの |
| --- | --- |
| 語彙台帳(`check_vocab.mjs`) | トピック間の前提依存・語の重複導入 |
| **スライド枚数(4〜6枚)** | 1トピック1テーマの粒度 |
| **`doc.md` / `practice.md` の画像** | LMSドキュメントの図解のリンク切れ |
| 図解トークン(`lint-skin.py`) | 配色・書体・4pxグリッド・viewBoxがskinの範囲内か |
| 図解のはみ出し(`diagram_export.py`) | `<text>` が `<rect>` / `<circle>` / `<ellipse>` の枠・viewBoxをはみ出していないか |
| pptx生成(`build_pptx.py`) | スライドの図解の実在 |

```bash
bun run --filter=@falcon/content materials
```

図解を追加・修正した場合は、そのトピックだけを検査できます。`<rect>` / `<circle>` / `<ellipse>` で描いた枠からのはみ出しはビルドが自動で検出しますが、`<path>` で描いた枠(外接矩形が意味を持たない任意形状)は対象外です。`<path>` を使う複雑な図は、生成された `.diagram.png` を目視で確認してください。

```bash
python .claude/skills/diagram-design/lint-skin.py packages/content/courses/<slug>/modules/<path>
python packages/content/scripts/diagram_export.py packages/content/courses/<slug>/modules/<path>
```

## 現在の状態

**全モジュールがトピック形式です。** 全10モジュール(M0〜M9)/ 42レッスン / 162トピックで完成しています。旧形式の教材は残っていません。

**教材本体は `courses/<slug>/modules/` です。** TypeScript 入門は `courses/typescript-basics/`。`bun run --filter=@falcon/content materials` で162トピック分の pptx が生成できます。

**SQL 入門（`courses/sql-basics/`）があります。** 6 モジュール / 6 レッスン / 24 トピックで、構成は [courses/sql-basics/CURRICULUM.md](courses/sql-basics/CURRICULUM.md)。コード演習は `course.json` の `exercises` で `@falcon/shared` の SQL 課題（`_lang/sql/`）に配線され、VS Code 拡張で採点されます。原典クレジットは CURRICULUM.md に集約しています。

**HTML/CSS 入門（`courses/html-css-basics/`）があります。** 6 モジュール / 22 レッスン / 83 トピックで、構成は [courses/html-css-basics/CURRICULUM.md](courses/html-css-basics/CURRICULUM.md)。ITのきほんから出る本土 2 本の 1 本（もう 1 本は SQL）。フロントエンド本線の起点（次は JavaScript 入門。Git 入門は JavaScript のあとにフロントの扇へ出る）。MDN Learn web development の Core 本経路に合わせており、Flex に加えて Grid・位置指定・最小限のレスポンシブ（`viewport` と幅 1 本の `@media`）まで扱います。見た目の自動採点は現時点の採点基盤にないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に留め、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。原典クレジットは CURRICULUM.md に集約しています。

**モダンCSS 入門（`courses/modern-css-basics/`）があります。** 4 モジュール / 9 レッスン / 28 トピックで、構成は [courses/modern-css-basics/CURRICULUM.md](courses/modern-css-basics/CURRICULUM.md)。HTML/CSS 入門の次に受ける中間講座で、入門で作った 1 枚のページを新しい部品を足さずに現代の書き方（`:root` のデザイントークン・`oklch()`/`color-mix()`・入れ子・論理プロパティ・`clamp()` の流体タイプ・`:focus-visible`）で見た目だけやり直します。`@layer`・コンテナクエリ・`@property` は対象外。HTML/CSS 入門と同じく見た目の自動採点が採点基盤にないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**UI部品 入門（`courses/ui-components-basics/`）があります。** 4 モジュール / 11 レッスン / 44 トピックで、構成は [courses/ui-components-basics/CURRICULUM.md](courses/ui-components-basics/CURRICULUM.md)。モダンCSS 入門の次に受ける講座で、代表的な UI 部品（カード・メディアオブジェクト・スプリットナビ・パンくずリスト・ページネーション・フォーム部品・`details`・ポップオーバー・宣言的な `dialog`）を **HTML 骨格 → レイアウト → トークン → 状態** の 4 段階で 1 つずつ作ります。JavaScript / DOM・WAI-ARIA APG の対話ウィジェット・カードの集合グリッド（後続の `page-composition-basics` の範囲）は対象外。Popover API と Invoker Commands API は MDN Baseline が Newly available なので、動かない環境ではフォールバックの JavaScript を書かない方針を CURRICULUM.md と本文に明記しています。HTML/CSS 入門・モダンCSS 入門と同じく見た目の自動採点が採点基盤にないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**ページ構成 入門（`courses/page-composition-basics/`）があります。** 3 モジュール / 6 レッスン / 23 トピックで、構成は [courses/page-composition-basics/CURRICULUM.md](courses/page-composition-basics/CURRICULUM.md)。UI部品 入門の次に受ける講座（Web 系列の到達点）で、既習の部品と `:root` のトークンだけを使って `header` / `nav` / `main` / `footer` のある 1 枚の静的ページに組み立てます（landmark の原則・帯 + wrapper・`repeat(auto-fill, minmax())` のカード集合・任意の `subgrid`・sticky footer・popover / dialog を 1 つずつ・skip link・幅 1 本の `@media` recap）。部品の HTML/CSS の初出とトークン定義の初出は置きません（再導入のみ）。HTML/CSS 入門と同じく見た目の自動採点が採点基盤にないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**JavaScript 入門（`courses/javascript-basics/`）があります。** 9 モジュール / 17 レッスン / 68 トピックで、構成は [courses/javascript-basics/CURRICULUM.md](courses/javascript-basics/CURRICULUM.md)。HTML/CSS 入門の次、TypeScript 入門の前に受けられる講座で、MDN Learn web development の Core Scripting 本経路に合わせて、言語の基礎（変数・数値・文字列・配列・条件分岐・ループ・関数）からイベント（`addEventListener`・バブリング・委譲・`preventDefault`）と DOM 操作（`querySelector` / `textContent` / `classList` / `createElement` + `appendChild` / `remove`）までを扱います。TypeScript・`fetch` / Promise・JSON・APG ウィジェット実装・インライン `onclick` は対象外（`querySelector` を本線にし、`getElementById` は読解のみ）。採点基盤の JS ランナー（QuickJS）に DOM / `document` が無いため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（テキストエディタ + ブラウザー。終端はレッスン 8-3 の買い物リスト）に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Python テスト自動化と CI 入門（`courses/python-testing-ci-basics/`）があります。** 7 モジュール / 8 レッスン / 28 トピックで、構成は [courses/python-testing-ci-basics/CURRICULUM.md](courses/python-testing-ci-basics/CURRICULUM.md)。採点基盤（`@falcon/code-runner`）のランナーが JavaScript / TypeScript / SQL のみで Python を実行できないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に置き、受講者が手元の Python + pytest で実行します。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Git 入門（`courses/git-basics/`）があります。** 11 モジュール / 37 レッスン / 141 トピックで、構成は [courses/git-basics/CURRICULUM.md](courses/git-basics/CURRICULUM.md)。基礎カテゴリの共通スキルで、スキルツリーでは実体 1 講座のまま両ルートの扇に星を出す（`appearances`。クリアは共有）。フロントの星は JavaScript 入門のあと、バックの星は Node.js 入門のあとに開く（`appearancePrerequisites`。扇ごとにちょうど 1 つで、それがその扇の親 = 線の元。組どうしは OR）。フロントエンド本線（JS → TS）の前提にはしない。Git サンドボックス・コマンド自動採点が採点基盤にないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元の VS Code のターミナルで試す」に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。旧デモ講座と同じ slug を再利用しており、seed の旧デモ削除リスト（`export-seed-sql.ts` の `RETIRED_DEMO_COURSES`）からは外してあります。図解 SVG は優先 8 トピック(9 枚。Issue #177)に導入済みで、残りのトピックには追加余地があります。原典クレジットは CURRICULUM.md に集約しています。

**基本情報技術者試験の対策講座があります。** 科目A対策（`courses/fe-kamoku-a/`）と科目B対策（`courses/fe-kamoku-b/`）の2講座で、IPA シラバスの「大分類 → 中分類」を「モジュール → レッスン」に写像しています。スキルツリーでは 科目A → 科目B の段階進行（科目B の前提は `fe-kamoku-a`）。科目Aは M1 基礎理論〜M10 模擬試験（21 レッスン / 86 トピック）、科目Bは M1 擬似言語〜M5 総合演習（10 レッスン / 30 トピック）が実装済み。問題はすべて自作で、IPA 過去問・サンプル問題の転載はしません（参照元クレジットは各講座の CURRICULUM.md に集約）。模擬試験モジュール（科目A の M10 / 科目B の M5）の確認クイズだけは、出題範囲がそのレッスンに閉じない意図的な例外です。残りは各 CURRICULUM.md の全体計画を参照。

**AWS Cloud Practitioner 入門（`courses/aws-clf-c02-basics/`）があります。** 11 モジュール / 19 レッスン / 81 トピックで、構成は [courses/aws-clf-c02-basics/CURRICULUM.md](courses/aws-clf-c02-basics/CURRICULUM.md)。AWS Certified Cloud Practitioner (CLF-C02) の対策講座で、平日10日(1日 ≒ 1モジュール)で公式試験ガイドの4ドメインを一巡し、11日目に本番と同じ65問の自作模擬試験(M10。各問の解説にドメインと復習先トピック ID 付き)で仕上げます。セキュリティ(M7)と AI/ML(レッスン6-1)を独立させ、200 サービスの暗記ではなく in-scope 代表サービスの「用途選択」に寄せています(ロングテールの in-scope サービスは各レッスン末尾の補完トピックと M10 doc の「一言辞書」でカバー)。問題はすべて自作で、公式 Practice Question・非公式問題集の転載はしません(合格保証もしません)。学習対象が用途選択の判断であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」(紙の上の概念マップ・判定練習。有料の AWS アカウントやコンソール操作は完走条件にしない)に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は優先 10 トピック(10 枚)に導入済みで、残りのトピックには追加余地があります。試験情報の調査日(2026-08-27)と参照元クレジットは CURRICULUM.md に集約しています。

**テスト設計と品質保証 入門（`courses/test-design-basics/`）があります。** 6 モジュール / 21 レッスン / 82 トピックで、構成は [courses/test-design-basics/CURRICULUM.md](courses/test-design-basics/CURRICULUM.md)。採点基盤（`@falcon/code-runner`）のランナーが JavaScript / TypeScript / SQL のみで Python を実行できないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に置き、受講者が手元の Python + pytest で実行します。図解 SVG は未作成(`assets/` を持つトピックが無い)。原典クレジットは CURRICULUM.md に集約しています。

**AI駆動開発の考え方（`courses/ai-fluency-basics/`）があります。** 5 モジュール / 7 レッスン / 28 トピックで、構成は [courses/ai-fluency-basics/CURRICULUM.md](courses/ai-fluency-basics/CURRICULUM.md)。Claude 研修シリーズの 1 本目で、製品操作を出さずに AI 駆動開発の考え方（4D と LLM の限界）だけを扱います。学習対象が判断であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（チャット画面や紙の上の判断演習）に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Claude チャット入門（`courses/claude-chat-basics/`）があります。** 4 モジュール / 7 レッスン / 26 トピックで、構成は [courses/claude-chat-basics/CURRICULUM.md](courses/claude-chat-basics/CURRICULUM.md)。Claude 研修シリーズの 2 本目で、claude.ai の会話・Projects・Artifacts までを扱います（Cowork / Claude Code は M3 の予告のみで操作手順は対象外）。学習対象が画面上の進め方であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（claude.ai での実践。アカウントが無い受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Cowork 入門（`courses/claude-cowork-basics/`）があります。** 6 モジュール / 6 レッスン / 26 トピックで、構成は [courses/claude-cowork-basics/CURRICULUM.md](courses/claude-cowork-basics/CURRICULUM.md)。Claude 研修シリーズの 3 本目で、チャットとの違い・ワークスペース・文脈の渡し方・タスクループ・プラグイン・向き不向きと安全を扱います（プラグイン自作・MCP サーバー・Claude Code の操作手順は対象外。コード編集の本編は Claude Code 講座に残します）。学習対象が任せ方の判断であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（Cowork での実践。使えない環境の受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Claude Code 入門（`courses/claude-code-basics/`）があります。** 6 モジュール / 8 レッスン / 28 トピックで、構成は [courses/claude-code-basics/CURRICULUM.md](courses/claude-code-basics/CURRICULUM.md)。Claude 研修シリーズの 4 本目で、コーディングエージェントとは何か・VS Code での始め方・許可とモード・Explore → Plan → Code → Commit の日常ワークフロー・コンテキスト管理・1 タスクの完走を扱います（CLAUDE.md ファイル / Skills / サブエージェント / hooks / MCP などのカスタマイズは後続講座の範囲。CLI は紹介のみ、JetBrains は対象外）。学習対象がエージェントとの進め方であってコードそのものではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（VS Code 上の Claude Code での実践。使えない環境の受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Skills とサブエージェント（`courses/claude-code-skills/`）があります。** 6 モジュール / 6 レッスン / 26 トピックで、構成は [courses/claude-code-skills/CURRICULUM.md](courses/claude-code-skills/CURRICULUM.md)。Claude 研修シリーズの 5 本目で、繰り返す指示の仕組み化を CLAUDE.md・Skill・サブエージェント・hook という 4 つの入れ物の使い分けとして扱います（CLAUDE.md と Skill は書けるまで、サブエージェントは渡す判断まで、hooks は名前と使いどころのみ。hooks の実装・MCP・実行スクリプト付き Skill は次講座の範囲）。成果物が Markdown の文章であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（VS Code 上の Claude Code で CLAUDE.md と SKILL.md を書く実践。使えない環境の受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**検証・hooks・MCP（`courses/claude-code-team/`）があります。** 6 モジュール / 6 レッスン / 25 トピックで、構成は [courses/claude-code-team/CURRICULUM.md](courses/claude-code-team/CURRICULUM.md)。Claude 研修シリーズの 6 本目（到達点）で、生成した変更の検証（テスト・lint・自分の目）・検証手順の Skill 化・hooks の実装判断・既存 MCP サーバーの接続（使う側のみ、自作はしない）・チームへの展開（リポジトリと個人用の分離、GitHub の @claude は紹介のみ）を扱います。成果物が検証の判断と設定であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（VS Code 上の Claude Code での実践。使えない環境の受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**ITのきほん（`courses/it-basics/`）があります。** 2 モジュール / 2 レッスン / 9 トピックで、構成は [courses/it-basics/CURRICULUM.md](courses/it-basics/CURRICULUM.md)。**スキルツリーの入口（中心のスキル）になる唯一の前提なし講座**で、コンピュータ・インターネットの本当に基本のことばをそろえます（スキルツリーの使い方・レッスンの型は画面のヘルプが担うので教材には書かない）。いちばん答えられるようになってほしい問いは「URL を開いてから画面が出るまで、何が起きているか」です。本土から出る枝は **2 本**（html-css-basics / sql-basics）。cli-basics は sql-basics の先。島（ai-fluency-basics / fe-kamoku-a / aws-clf-c02-basics）は it-basics クリアが**表示条件**で、本土から線は引かない。フロントエンド本線は html-css-basics → javascript-basics から Git（フロント）と typescript-basics に分かれ、npm は Git のあと、fetch は TypeScript のあと。バックエンドの背骨は sql-basics → cli-basics → node-basics → typescript-node-basics → rest-api-basics（準備中）で、git-basics は実体 1 講座のまま両ルートの扇に置く。python-testing-ci-basics → test-design-basics は開発を知ってからの発展概念として typescript-node-basics の先、fe-kamoku-b は fe-kamoku-a の先（情報処理系の段階進行）。どの星からも出る枝は最大 2 本。**この講座に前提を書いてはいけません**（中心のスキルが閉じるとツリー全体が開かなくなる）。学習対象がことばの理解であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（自分の PC と紙の上）に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は未作成（`assets/` を持つトピックが無い）。

**スキルツリーは [roadmap.sh](https://roadmap.sh/) を参考にした「本土 2 ルート + 島」構成です（カテゴリ = ルート / 島）。** 本土のカテゴリは「基礎」（it-basics。git-basics は基礎カテゴリのまま、ツリー上は FE / BE の両扇に出す）・「フロントエンド」（html-css → js から Git と ts に分かれ、CSS 系列は html-css から）・「バックエンド」（sql から cli / db-design。python-testing-ci → test-design は typescript-node-basics の先の発展概念。背骨は sql → cli → node → typescript-node-basics → rest-api）の 3 つ。**どの星からも出る枝は最大 2 本**（AND 合流は枝に数えない）。**「AWS資格」（aws-clf-c02-basics）・「情報処理資格」（fe-kamoku-a → fe-kamoku-b の段階進行）・「AI駆動開発」（Claude 研修シリーズ）は本土から離れた「島」**で、表示条件（既定 = it-basics クリア。`@falcon/shared/skill-map/islands` で島ごとに設定）を満たした受講者にだけスキルツリーへ現れる。theme はカテゴリごとに 1 つ（フロントエンド =「Web の見た目と動き」、バックエンド =「サーバーとデータの基盤」、AWS資格 =「資格で示すクラウド力」、情報処理資格 =「資格で示す基礎力」）。**準備中のプレースホルダ講座が 13 件あります**（FE: fetch-api-basics / npm-build-basics / react-basics / web-a11y-basics / frontend-testing-basics、BE: cli-basics / node-basics / typescript-node-basics / rest-api-basics / auth-basics / web-security-basics / db-design-basics / docker-basics）。各プレースホルダは M0 に「この講座で学ぶこと」1 トピックだけを持ち、description が「【準備中】」で始まります。本執筆時は ADDING_COURSE.md の手順で M1 以降を足し、CURRICULUM.md を確定版に書き換えてください（ツリー上の位置＝前提はプレースホルダの時点で確定済み）。

TypeScript 入門の全体構成は **[courses/typescript-basics/CURRICULUM.md](courses/typescript-basics/CURRICULUM.md)** にあります。新しい講座を足すときは **[ADDING_COURSE.md](ADDING_COURSE.md)** が正本です。

**LMS への投入は整備済みです。** `main` への push で `db:seed:remote:content` が走り、`courses/` 配下の各講座が D1 に upsert されます。スライド・まとめ・確認クイズの本文は `lessons.markdown` に入ります。図解 SVG は D1 ではなく R2 ですが、こちらもデプロイに含まれる（seed の前に全件アップロードする）ので、手動実行は不要です。ローカルに入れるときだけ `bun run --filter=@falcon/content upload` を叩いてください。

**講座サムネイルは執筆済みの 20 講座に入っています（`courses/<slug>/thumbnail.webp`。準備中のプレースホルダ 13 講座は color のストライプ表示にフォールバック）。** 一覧カードがその画像になります。16:9 / 推奨 1600×900 / 400KB 以内で、規格は `bun run content:check` が検査します。図解 SVG と同じくデプロイで R2 に反映されるので、手動アップロードは不要です。画像は手で描かず `scripts/build_thumbnails.py`（`bun run --filter=@falcon/content thumbnails`）が生成します。20 枚が 1 つのシリーズに見えることが前提なので、新しい講座もスクリプトの `SPECS` に足してください。外部ロゴは使いません（商標の許諾が要るうえ、公認教材だという誤認を生むため）。詳細は [ADDING_COURSE.md](ADDING_COURSE.md) の「6. サムネイル」。

**スキルツリーの講座アイコンも同じ 20 講座に入っています（`courses/<slug>/icon.svg`）。** 星の中（解放済み・進行中・クリア）に出る 24×24 の**単色シルエット**で、サムネイルのモチーフの「核」を 1 図形に単純化したもの。画面は認可付き API から SVG を取り CSS mask + `currentColor` で塗るので SVG に色を持たせず（アルファだけが使われる。白抜きは効かない）。R2 キーは内容ハッシュ入り（`stages.icon_path`）でサムネイルと一緒にデプロイが流します。準備中のプレースホルダ講座には置いていません（状態グリフのまま）。詳細は [ADDING_COURSE.md](ADDING_COURSE.md) の「スキルツリーのアイコン」。

未着手の課題:

- **図解SVGの不足** — 旧形式から流用したため、図解を持たないトピックがある。`assets/` がないトピックには追加余地がある
- **画像素材の追加** — 実画面のスクリーンショット(Playground・VS Code)の挿入。講座サムネイルは執筆済み 20 講座に設置済み（準備中 13 講座は未設置）
- **収録** — 162本の動画収録は未着手
- **演習問題の Assignment 化** — `practice.md` の演習を LMS の Assignment として扱えるようにする作業は未着手

## 作業の進め方

レッスン単位で作業し、モジュールごとにコミットしてください。全体に一括で及ぶ変更は、スクリプトで処理してから全ビルド検証を行ってください。

トピック / レッスン / 新しい講座の足し方は **[ADDING_COURSE.md](ADDING_COURSE.md)** を先に読む。

外部で見つけたテーマを教材にするか迷うとき、および講座の要件（到達目標・スコープ・規模・評価方法）を決めるときは **[THEME_TO_COURSE.md](THEME_TO_COURSE.md)** を使う。カリキュラム（takeaway 一覧）が固まる前に本文を書き始めない。
