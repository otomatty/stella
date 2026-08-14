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
- **ファイル名順 = 収録順**です。IDが衝突するとビルドが落ちます
- 全体ビルド時は `dist/slides/` を作り直します(構成変更で名前が変わった古い出力が残らないように)。対象を指定したプレビュー時は残します

ビルド生成物(`slides.pptx` / `assets/*.diagram.png` / `dist/`)は `.gitignore` 済みです。コミットしないでください。**`assets/*.svg` も生成物ですが、こちらはコミットします**(`slides.md` / `doc.md` が参照する正本のため)。

## 絶対に守るルール

1. **1トピック = 1 Takeaway を崩さない** — スライドを足したくなったら、まずトピックを割れないか考えてください。「関連情報」は Takeaway を強化する枠(図解 or 失敗例)1つだけに収めます。詰め込みは粒度の設計を壊します。
2. **語彙台帳を必ず更新する** — トピックを追加・移動・改稿したら `introduces` / `requires` を更新し、`bun run --filter=@falcon/content materials` で検査を通してください。
3. **クレジット表記を教材本体に入れない** — 原典への言及は `README.md` に集約する方針です。スライド・ドキュメント本文・講師ノートに「サバイバルTypeScript」等の原典名を書かないでください(LMSドキュメント末尾の「もっと知りたい人へ」の参考リンクは例外として可)。
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

TypeScript 入門の全体構成は **[courses/typescript-basics/CURRICULUM.md](courses/typescript-basics/CURRICULUM.md)** にあります。新しい講座を足すときは **[ADDING_COURSE.md](ADDING_COURSE.md)** が正本です。

**LMS への投入は整備済みです。** `main` への push で `db:seed:remote:content` が走り、`courses/` 配下の各講座が D1 に upsert されます。スライド・まとめ・確認クイズの本文は `lessons.markdown` に入ります。図解 SVG は D1 ではなく R2 なので、`bun run --filter=@falcon/content upload:remote` を別途実行してください（デプロイワークフローには含まれません）。

未着手の課題:

- **図解SVGの不足** — 旧形式から流用したため、図解を持たないトピックがある。`assets/` がないトピックには追加余地がある
- **画像素材の追加** — 実画面のスクリーンショット(Playground・VS Code)の挿入
- **収録** — 162本の動画収録は未着手
- **演習問題の Assignment 化** — `practice.md` の演習を LMS の Assignment として扱えるようにする作業は未着手

## 作業の進め方

レッスン単位で作業し、モジュールごとにコミットしてください。全体に一括で及ぶ変更は、スクリプトで処理してから全ビルド検証を行ってください。

トピック / レッスン / 新しい講座の足し方は **[ADDING_COURSE.md](ADDING_COURSE.md)** を先に読む。
