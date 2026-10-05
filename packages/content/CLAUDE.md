# CLAUDE.md

このディレクトリでClaude Codeが作業する際の指針です。作業開始前に必ず読んでください。

## このディレクトリは何か

社内の**未経験エンジニア向け研修教材**です。動画講義(ショート動画)とLMS掲載用のドキュメントの2本立てです。

この教材は `stella` の LMS に配信されます。`packages/content` がその正本で、スライド・ドキュメント・演習はここで書き、LMS へは seed で投入します。講座は `courses/<slug>/` 単位で、**新しい講座を足すのが既定の手順**です（[ADDING_COURSE.md](ADDING_COURSE.md)）。

原典は [サバイバルTypeScript](https://typescriptbook.jp/)(CC BY-SA 4.0)ですが、**未経験者向けに順序・粒度を再設計した独自教材**であり、原典の翻訳や写しではありません。

## 教材の単位(3層)

粒度の定義がこの教材の設計の中心です。**モジュール / レッスン / トピック**の3層で構成します。

| 層 | 定義 | 目安 | 成果物 |
| --- | --- | --- | --- |
| モジュール | 旧形式の大テーマ、新形式の単元 | 講座ごとに構成する | — |
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

例: `packages/content/courses/salesforce-dev-basics/modules/m0-orientation/l1-platform/t1-what-is-salesforce/slides.md`

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
bun run --filter=@stella/content materials        # 全トピックを pptx 化
bun run --filter=@stella/content materials -- courses/salesforce-dev-basics/modules/m0-orientation/l1-platform   # 一部だけ
bun run --filter=@stella/content check:ci         # 語彙台帳・画像リンク・スライド枚数の検査（CI と同じ）
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

### 教材動画 (PoC)

トピックに台本 `narration.json` を置くと、ナレーション・字幕付きの動画を作れます。旧 it-basics の9トピックと TypeScript の1トピックで検証しました。両講座の退役に伴い、旧台本は Git 履歴に保存されています。生成基盤は残していますが、現行カタログには台本のあるトピックはありません。配信 (R2・D1・画面) は未実装です。

- 台本のルールは [NARRATION_GUIDE.md](NARRATION_GUIDE.md)。読み辞書は `narration/readings.json`
- **台本のあるトピックの `slides.md` (本文・ノート・title・takeaway) を直すと `check:ci` が落ちます** (台本が古くなったため)。台本を直すか、内容が今のスライドに合っていれば `bun run --filter=@stella/content narrate -- <トピックのパス> --accept` で承認してください
- 検査: `bun run --filter=@stella/content narration:check` (`check:ci` に含まれる)
- 生成: `bun run content:video -- dev-env-basics --tts openjtalk` → `dist/video/`。ffmpeg と `pip install pyopenjtalk-prebuilt "numpy<2"` が要ります。鍵のある環境では `--tts gemini` (`GEMINI_API_KEY`) / `--tts grok` (AI Gateway) を使います

## 絶対に守るルール

1. **1トピック = 1 Takeaway を崩さない** — スライドを足したくなったら、まずトピックを割れないか考えてください。「関連情報」は Takeaway を強化する枠(図解 or 失敗例)1つだけに収めます。詰め込みは粒度の設計を壊します。
2. **語彙台帳を必ず更新する** — トピックを追加・移動・改稿したら `introduces` / `requires` を更新し、`bun run --filter=@stella/content materials` で検査を通してください。
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
bun run --filter=@stella/content materials
```

図解を追加・修正した場合は、そのトピックだけを検査できます。`<rect>` / `<circle>` / `<ellipse>` で描いた枠からのはみ出しはビルドが自動で検出しますが、`<path>` で描いた枠(外接矩形が意味を持たない任意形状)は対象外です。`<path>` を使う複雑な図は、生成された `.diagram.png` を目視で確認してください。

```bash
python .claude/skills/diagram-design/lint-skin.py packages/content/courses/<slug>/modules/<path>
python packages/content/scripts/diagram_export.py packages/content/courses/<slug>/modules/<path>
```

## 現在の状態

教材は `courses/<slug>/modules/` が正本です。新18講座と残す17講座の計35講座があります。新18講座は M0 の準備中案内だけを持ち、新形式の教材・課題は #28・#41 で作成します。残す講座のうち Python・DevOps・ネットワーク運用・Kubernetes・Terraform も準備中なので、準備中は計23講座です。

唯一の前提なし講座は `dev-env-basics` です。この講座には前提を追加しないでください。新18講座の slug・前提・線の親・カテゴリは `docs/curriculum/07-stella-adoption-redesign.md` §3.1・§3.4 が正本です。本土のカテゴリは基礎・フロントエンド・バックエンド・フルスタックです。解放は全前提の AND、線と枝数は `parent` 1 本で決まります。どの星からも枝は最大2本です。

AWS資格・情報処理資格・AI駆動開発・Salesforce案件は `dev-env-basics` クリアで現れる島です。DevOps は `python-basics` クリアで現れます。表示条件は `@stella/shared/skill-map/islands` に定義します。Salesforce は `audience: granted` の専用星で、割り当てられた受講者だけに出ます。Git の独立講座は退役し、Git の練習は新講座へ分散します。複製を扱う機能は維持していますが、現行カタログに複製する講座はありません。

退役した19講座の教材ディレクトリは削除し、seed の `RETIRED_STAGES` が安定 UUID のステージと関連データを削除します。引き継ぐ6つの slug をこの一覧に追加しないでください。旧 TypeScript 課題66問は `packages/shared/src/problems/` と既存D1に保持し、新タスクへ転用しません。

新18講座のサムネイルと `icon.svg` は `scripts/build_thumbnails.py` の `SPECS` から生成します。24×24 のアイコンは単色シルエットです。外部ロゴは使いません。画像・本文は main への push で R2 と D1 に反映されます。旧 it-basics の動画台本は新教材に流用せず、#41 で dev-env-basics の解説を執筆したあとに新しい台本を作り、#20 の PoC を再開します。

残す教材の本文は維持します。新規講座と教材の追加手順は [ADDING_COURSE.md](ADDING_COURSE.md)、執筆規則は [STYLE_GUIDE.md](STYLE_GUIDE.md) を参照してください。

## 作業の進め方

レッスン単位で作業し、モジュールごとにコミットしてください。全体に一括で及ぶ変更は、スクリプトで処理してから全ビルド検証を行ってください。

トピック / レッスン / 新しい講座の足し方は **[ADDING_COURSE.md](ADDING_COURSE.md)** を先に読む。

外部で見つけたテーマを教材にするか迷うとき、および講座の要件（到達目標・スコープ・規模・評価方法）を決めるときは **[THEME_TO_COURSE.md](THEME_TO_COURSE.md)** を使う。カリキュラム（takeaway 一覧）が固まる前に本文を書き始めない。
