---
name: diagram-design
description: この教材(TypeScript研修)のスライド用SVG図解を新規作成・修正するときに読む。図の型選び、複雑度の上限、教材skinの参照先、出力前チェックリストを定義する。
---

# diagram-design

教材の図解は `assets/<名前>.html` が正本(SVGを内包)で、`packages/content/scripts/diagram_export.py` が `assets/<名前>.svg` と `assets/<名前>.diagram.png` を書き出す。この SKILL は「何をどう描くか」だけを扱う。ビルドの仕組みは `CLAUDE.md` を見ること。

## 哲学

上流 [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)(MIT)の設計思想を引き継ぐ: **消せるなら消す。** ノード・矢印・色は多いほど読みにくくなる。1枚の図の焦点は1つ。

- 複雑度の budget: ノード6・矢印8・accent1(`ok`/`ng` を使う図は accent 0)。comparison は列2、階層構造は3階層まで。超えたら描き方を工夫するのではなく、トピックを割る。
- **表で足りるなら表にする。** 3列以上の比較、4個以上の分類は図ではなく `doc.md` の表に落とす。図は「関係性」や「流れ」など、表では伝わらないものだけに使う。

## 型の選定ガイド

| 何を見せたいか | 型 | reference |
| --- | --- | --- |
| 分岐する判断ロジック・ユーザー操作の分岐 | flowchart | `references/type-flowchart.md` |
| 担当者/部門をまたぐ業務プロセス(誰が・何を・どのツールで) | process | `references/type-process.md` |
| 時系列の出来事の並び | timeline | `references/type-timeline.md` |
| 複数アクター間のリクエスト/レスポンスの往復 | sequence | `references/type-sequence.md` |
| 状態と遷移(有限個の状態を行き来する) | state | `references/type-state.md` |
| 親子関係・階層構造(組織図・依存関係・分類) | tree | `references/type-tree.md` |
| 入れ子関係(あるものが別のものの中にある) | nested | `references/type-nested.md` |
| 集合の重なり(共通点・差分) | venn | `references/type-venn.md` |
| 積み重なった層(抽象度・責務のレイヤー) | layers | `references/type-layers.md` |
| 役割をまたいでデータが変換されていく流れ | data-flow | `references/type-data-flow.md` |
| A と B のどちらか一方だけが持つ性質を1つ見せる | comparison | `references/type-comparison.md` |

迷ったら comparison から検討する。教材が「AとBの違い」を扱うトピックが多いため、最も出番が多い型。

## アンチパターン(上流から教材に効くもの)

- ノードに影(box-shadow / filter)を付ける。
- 種類の異なるノードをすべて同じ形にする(意味の違いを形で示せる場面で色だけに頼らない)。
- 斜めのコネクタ(直角ルーティングを使う)。
- ラベルが線の上に直接乗る(視認性が落ちる。線をまたぐ位置を避けるか、paper色のマスクを敷く)。
- マスクなしでラベルを線や図形に重ねる。
- 凡例を図の中に置く(色の意味は本文や eyebrow で説明する。図に凡例ボックスを追加しない)。
- 縦書き・回転したテキスト(読みにくい。日本語はすべて横書き)。

## skin

色・書体・線幅・角丸・グリッドの正本は **`references/style-guide.md`** です。値はそこにしかありません。このファイルには複製しません。値を変えたくなったら `style-guide.md` を直接編集してください(`lint-skin.py` が同じファイルを読むため、lint と教材全体が同時に更新されます)。

## 手順

1. `.claude/skills/diagram-design/assets/template.html` を図を置きたい `assets/` フォルダにコピーする。
2. 見せたいものに合う型を上の表で選び、対応する `references/type-<型>.md` を読む。
3. `references/style-guide.md` のトークンだけを使って `<svg>` の中身を描く。
4. 下の出力前チェックリストを確認する。
5. `python .claude/skills/diagram-design/lint-skin.py <path>` と `python packages/content/scripts/diagram_export.py <path>` を実行し、生成された `.diagram.png` を目で見る。

## 出力前チェックリスト

- [ ] 型は選定ガイドの用途に合っているか(comparisonなのにflowchartの形をしていないか等)
- [ ] 図にタイトルを入れていないか(タイトルはスライド側が持つ)
- [ ] 消せるノード・矢印・装飾はないか
- [ ] `accent` または `ok`/`ng` を使う要素は1つだけか(`ok`/`ng` を使う図で `accent` を併用していないか)
- [ ] ノード6・矢印8・comparison列2・階層3の budget 内か
- [ ] 和文テキストは `'Noto Sans JP'` か
- [ ] コード識別子・コード断片は `'Geist Mono'` か
- [ ] 色・書体・線幅・座標がすべて presentation attribute(属性)で書かれているか(`<style>` ブロックや `class`、`var()` に依存していないか)
- [ ] 座標・寸法・フォントサイズが4の倍数か

## 検証

リポジトリルートを cwd として実行する。

```bash
python .claude/skills/diagram-design/lint-skin.py <path>          # skin違反(色・書体・4pxグリッド・accent上限)を検査
python packages/content/scripts/diagram_export.py <path>          # SVG/PNGを生成し、日本語のはみ出しを検査
```

`bun run --filter=@stella/content materials` は上記2つを全図に対して実行してから pptx を再構築する。ビルドが通れば skin 違反もはみ出しも無いことが保証される。

## 出典

このスキルは上流 [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)(MIT License)を教材向けに改変したものです。ライセンス全文は同ディレクトリの `LICENSE` を参照してください。
