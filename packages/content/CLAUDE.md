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
header: "TypeScript入門研修"
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

**HTML/CSS 入門（`courses/html-css-basics/`）があります。** 6 モジュール / 22 レッスン / 83 トピックで、構成は [courses/html-css-basics/CURRICULUM.md](courses/html-css-basics/CURRICULUM.md)。MDN Learn web development の Core 本経路に合わせており、Flex に加えて Grid・位置指定・最小限のレスポンシブ（`viewport` と幅 1 本の `@media`）まで扱います。見た目の自動採点は現時点の採点基盤にないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に留め、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。原典クレジットは CURRICULUM.md に集約しています。

**モダンCSS 入門研修（`courses/modern-css-basics/`）があります。** 4 モジュール / 9 レッスン / 28 トピックで、構成は [courses/modern-css-basics/CURRICULUM.md](courses/modern-css-basics/CURRICULUM.md)。HTML/CSS 入門の次に受ける中間講座で、入門で作った 1 枚のページを新しい部品を足さずに現代の書き方（`:root` のデザイントークン・`oklch()`/`color-mix()`・入れ子・論理プロパティ・`clamp()` の流体タイプ・`:focus-visible`）で見た目だけやり直します。`@layer`・コンテナクエリ・`@property` は対象外。HTML/CSS 入門と同じく見た目の自動採点が採点基盤にないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Python テスト自動化と CI 入門（`courses/python-testing-ci-basics/`）があります。** 7 モジュール / 8 レッスン / 28 トピックで、構成は [courses/python-testing-ci-basics/CURRICULUM.md](courses/python-testing-ci-basics/CURRICULUM.md)。採点基盤（`@falcon/code-runner`）のランナーが JavaScript / TypeScript / SQL のみで Python を実行できないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に置き、受講者が手元の Python + pytest で実行します。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Git 入門研修（`courses/git-basics/`）があります。** 11 モジュール / 37 レッスン / 141 トピックで、構成は [courses/git-basics/CURRICULUM.md](courses/git-basics/CURRICULUM.md)。Git サンドボックス・コマンド自動採点が採点基盤にないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元の VS Code のターミナルで試す」に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。旧デモ講座と同じ slug を再利用しており、seed の旧デモ削除リスト（`export-seed-sql.ts` の `RETIRED_DEMO_COURSES`）からは外してあります。図解 SVG は優先 8 トピック(9 枚。Issue #177)に導入済みで、残りのトピックには追加余地があります。原典クレジットは CURRICULUM.md に集約しています。

**基本情報技術者試験の対策講座があります。** 科目A対策（`courses/fe-kamoku-a/`）と科目B対策（`courses/fe-kamoku-b/`）の2講座で、IPA シラバスの「大分類 → 中分類」を「モジュール → レッスン」に写像しています。科目Aは M1 基礎理論〜M10 模擬試験（21 レッスン / 86 トピック）、科目Bは M1 擬似言語〜M5 総合演習（10 レッスン / 30 トピック）が実装済み。問題はすべて自作で、IPA 過去問・サンプル問題の転載はしません（参照元クレジットは各講座の CURRICULUM.md に集約）。模擬試験モジュール（科目A の M10 / 科目B の M5）の確認クイズだけは、出題範囲がそのレッスンに閉じない意図的な例外です。残りは各 CURRICULUM.md の全体計画を参照。

**テスト設計と品質保証 入門研修（`courses/test-design-basics/`）があります。** 6 モジュール / 21 レッスン / 82 トピックで、構成は [courses/test-design-basics/CURRICULUM.md](courses/test-design-basics/CURRICULUM.md)。採点基盤（`@falcon/code-runner`）のランナーが JavaScript / TypeScript / SQL のみで Python を実行できないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」に置き、受講者が手元の Python + pytest で実行します。図解 SVG は未作成(`assets/` を持つトピックが無い)。原典クレジットは CURRICULUM.md に集約しています。

**AI駆動開発の考え方（`courses/ai-fluency-basics/`）があります。** 5 モジュール / 7 レッスン / 28 トピックで、構成は [courses/ai-fluency-basics/CURRICULUM.md](courses/ai-fluency-basics/CURRICULUM.md)。Claude 研修シリーズの 1 本目で、製品操作を出さずに AI 駆動開発の考え方（4D と LLM の限界）だけを扱います。学習対象が判断であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（チャット画面や紙の上の判断演習）に置き、LMS 上はスライド → まとめ → 確認クイズだけで完走できます。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Claude チャット入門（`courses/claude-chat-basics/`）があります。** 4 モジュール / 7 レッスン / 26 トピックで、構成は [courses/claude-chat-basics/CURRICULUM.md](courses/claude-chat-basics/CURRICULUM.md)。Claude 研修シリーズの 2 本目で、claude.ai の会話・Projects・Artifacts までを扱います（Cowork / Claude Code は M3 の予告のみで操作手順は対象外）。学習対象が画面上の進め方であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（claude.ai での実践。アカウントが無い受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Cowork 入門（`courses/claude-cowork-basics/`）があります。** 6 モジュール / 6 レッスン / 26 トピックで、構成は [courses/claude-cowork-basics/CURRICULUM.md](courses/claude-cowork-basics/CURRICULUM.md)。Claude 研修シリーズの 3 本目で、チャットとの違い・ワークスペース・文脈の渡し方・タスクループ・プラグイン・向き不向きと安全を扱います（プラグイン自作・MCP サーバー・Claude Code の操作手順は対象外。コード編集の本編は Claude Code 講座に残します）。学習対象が任せ方の判断であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（Cowork での実践。使えない環境の受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Claude Code 入門（`courses/claude-code-basics/`）があります。** 6 モジュール / 8 レッスン / 28 トピックで、構成は [courses/claude-code-basics/CURRICULUM.md](courses/claude-code-basics/CURRICULUM.md)。Claude 研修シリーズの 4 本目で、コーディングエージェントとは何か・VS Code での始め方・許可とモード・Explore → Plan → Code → Commit の日常ワークフロー・コンテキスト管理・1 タスクの完走を扱います（CLAUDE.md ファイル / Skills / サブエージェント / hooks / MCP などのカスタマイズは後続講座の範囲。CLI は紹介のみ、JetBrains は対象外）。学習対象がエージェントとの進め方であってコードそのものではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（VS Code 上の Claude Code での実践。使えない環境の受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**Skills とサブエージェント（`courses/claude-code-skills/`）があります。** 6 モジュール / 6 レッスン / 26 トピックで、構成は [courses/claude-code-skills/CURRICULUM.md](courses/claude-code-skills/CURRICULUM.md)。Claude 研修シリーズの 5 本目で、繰り返す指示の仕組み化を CLAUDE.md・Skill・サブエージェント・hook という 4 つの入れ物の使い分けとして扱います（CLAUDE.md と Skill は書けるまで、サブエージェントは渡す判断まで、hooks は名前と使いどころのみ。hooks の実装・MCP・実行スクリプト付き Skill は次講座の範囲）。成果物が Markdown の文章であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（VS Code 上の Claude Code で CLAUDE.md と SKILL.md を書く実践。使えない環境の受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

**検証・hooks・MCP（`courses/claude-code-team/`）があります。** 6 モジュール / 6 レッスン / 25 トピックで、構成は [courses/claude-code-team/CURRICULUM.md](courses/claude-code-team/CURRICULUM.md)。Claude 研修シリーズの 6 本目（到達点）で、生成した変更の検証（テスト・lint・自分の目）・検証手順の Skill 化・hooks の実装判断・既存 MCP サーバーの接続（使う側のみ、自作はしない）・チームへの展開（リポジトリと個人用の分離、GitHub の @claude は紹介のみ）を扱います。成果物が検証の判断と設定であってコードではないため、**コード演習は配線していません**（`course.json` に `exercises` を持たない）。手を動かす部分は `practice.md` の「手元で試す」（VS Code 上の Claude Code での実践。使えない環境の受講者は飛ばしてもスライド → まとめ → 確認クイズだけで完走できます）。図解 SVG は未作成（`assets/` を持つトピックが無い）。原典クレジットは CURRICULUM.md に集約しています。

TypeScript 入門の全体構成は **[courses/typescript-basics/CURRICULUM.md](courses/typescript-basics/CURRICULUM.md)** にあります。新しい講座を足すときは **[ADDING_COURSE.md](ADDING_COURSE.md)** が正本です。

**LMS への投入は整備済みです。** `main` への push で `db:seed:remote:content` が走り、`courses/` 配下の各講座が D1 に upsert されます。スライド・まとめ・確認クイズの本文は `lessons.markdown` に入ります。図解 SVG は D1 ではなく R2 ですが、こちらもデプロイに含まれる（seed の前に全件アップロードする）ので、手動実行は不要です。ローカルに入れるときだけ `bun run --filter=@falcon/content upload` を叩いてください。

**講座サムネイルは全 15 講座に入っています（`courses/<slug>/thumbnail.webp`）。** 一覧カードがその画像になります。16:9 / 推奨 1600×900 / 400KB 以内で、規格は `bun run content:check` が検査します。図解 SVG と同じくデプロイで R2 に反映されるので、手動アップロードは不要です。画像は手で描かず `scripts/build_thumbnails.py`（`bun run --filter=@falcon/content thumbnails`）が生成します。15 枚が 1 つのシリーズに見えることが前提なので、新しい講座もスクリプトの `SPECS` に足してください。外部ロゴは使いません（商標の許諾が要るうえ、公認教材だという誤認を生むため）。詳細は [ADDING_COURSE.md](ADDING_COURSE.md) の「6. サムネイル」。

未着手の課題:

- **図解SVGの不足** — 旧形式から流用したため、図解を持たないトピックがある。`assets/` がないトピックには追加余地がある
- **画像素材の追加** — 実画面のスクリーンショット(Playground・VS Code)の挿入。講座サムネイルは全 15 講座に設置済み
- **収録** — 162本の動画収録は未着手
- **演習問題の Assignment 化** — `practice.md` の演習を LMS の Assignment として扱えるようにする作業は未着手

## 作業の進め方

レッスン単位で作業し、モジュールごとにコミットしてください。全体に一括で及ぶ変更は、スクリプトで処理してから全ビルド検証を行ってください。

トピック / レッスン / 新しい講座の足し方は **[ADDING_COURSE.md](ADDING_COURSE.md)** を先に読む。

外部で見つけたテーマを教材にするか迷うとき、および講座の要件（到達目標・スコープ・規模・評価方法）を決めるときは **[THEME_TO_COURSE.md](THEME_TO_COURSE.md)** を使う。カリキュラム（takeaway 一覧）が固まる前に本文を書き始めない。
