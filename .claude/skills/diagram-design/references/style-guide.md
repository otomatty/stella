# 図解 skin — 教材版トークン

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

このファイルが図解トークンの**唯一の正本**です。`.claude/skills/diagram-design/lint-skin.py` はここに書かれたバッククォート囲みの hex を許可色として読み、`assets/*.html` を検査します。値を変えるときはこのファイルだけを直せば、lint と教材全体の配色が同時に更新されます。

値は `design-system/_ds_manifest.json`(Sports Force / Tech&Boost デザインシステム)から写したものです。例えば `accent` の `#E62F9A` は同ファイルの `--sf-magenta`、`ink` の `#0E0E10` は `--ink-900` にそれぞれ対応します。

## カラートークン

| role | 値 |
| --- | --- |
| `paper` / `paper-2` | `#FFFFFF` / `#F7F7F9` |
| `ink` | `#0E0E10` |
| `muted` / `soft` | `#5C5C66` / `#8A8A93` |
| `rule` / `rule-solid` | `#DDDDE2` / `#B7B7BE` |
| `accent` / `accent-tint` | `#E62F9A` / `rgba(230,47,154,0.08)` |
| `link` | `#2563EB` |
| `ok` / `ok-tint` | `#16A34A` / `rgba(22,163,74,0.08)` |
| `ng` / `ng-tint` | `#E5342B` / `rgba(229,52,43,0.08)` |

**`ok` / `ng` は教材独自の拡張**です(上流の diagram-design にはありません)。正解/誤り、成功/失敗を対比させる図でだけ使います。排他ルール:

- `ok` または `ng` を使う図では `accent` を使わない(焦点信号が競合するため)。
- `ok` ・ `ng` はそれぞれ**1要素まで**。

`-tint` の3色(`accent-tint` / `ok-tint` / `ng-tint`)は `rgba(...)` で書きます。`lint-skin.py` は hex(`#RRGGBB`)だけを検査するので、`rgba(...)` はそもそも検査対象外です(意図した設計 — 淡色の塗りは自由度を持たせています)。

### paper を純白にしている理由

上流の `paper` はうっすら灰色でしたが、教材では `#FFFFFF`(純白)に固定しています。スライドの背景が白基調であることに加え、`.diagram.png` は透過で書き出すため、紙色そのものは画面上に現れません。`paper` はあくまで「白背景の上に重ねる要素の下地色」として扱ってください。

## タイポグラフィ

| role | サイズ / ウェイト | 書体 |
| --- | --- | --- |
| node-name | 24 / 600 | `'Noto Sans JP'`、コード識別子は `'Geist Mono'` 500 |
| sublabel | 20 / 400 | `'Geist Mono'`、和文注記は `'Noto Sans JP'` |
| arrow-label | 16 / 400 | `'Geist Mono'` |
| eyebrow | 16 / 500、`letter-spacing="0.18em"` 大文字 | `'Figtree'` |

許可される `font-family` は `'Noto Sans JP'` / `'Figtree'` / `'Geist Mono'` の3つ(+ フォールバックの `sans-serif` / `monospace`)だけです。上流にあった `Instrument Serif` は教材のトークンに存在しないため使いません。

`900` ウェイトを使うため、Google Fonts の読み込みには `Noto+Sans+JP:wght@400;500;700;900` を含めてください(`900` が無いとブラウザ側で太字が合成され、輪郭が汚くなります)。

## タイトル

**図にタイトルは入れません。** タイトルはスライド側の見出しが持ちます。図は本体だけを描いてください。

## 線幅・角丸

線幅は `1.5` / `2` / `2.5` の3段階、角丸は `8` / `12` の2段階です。

上流は `0.8` / `1` / `1.2` でしたが、教材では太らせています。スライド上で図が縮小表示されることと、動画書き出し時の圧縮で 1px 前後の細線が潰れて見えなくなるため、最小線幅を `1.5` に引き上げました。

## SVG のスタイルは presentation attribute で書く

`assets/<名前>.svg` は `diagram_export.py` が HTML から `<svg>` を単体で抜き出し、それを PNG 化・埋め込みします。CSS の `<style>` ブロックやクラス名、`var(--token)` には依存できません(SVG 単体で描画されるため、クラスの定義元が失われます)。色・フォント・線幅は必ず `fill`、`stroke`、`font-family`、`stroke-width` などの属性に直接値を書いてください。

```html
<!-- 良い例 -->
<rect fill="#FFFFFF" stroke="#B7B7BE" stroke-width="2" rx="12"/>
<text font-family="'Noto Sans JP', sans-serif" font-size="24" fill="#0E0E10">ノード名</text>

<!-- 悪い例(CSS変数・クラスは効かない) -->
<rect class="node" style="fill: var(--paper)"/>
```

## グリッドと viewBox

- viewBox は幅 `1200` 固定です(`0 <minY> 1200 <高さ>`)。
- **本体を描き終えてから** `minY` と高さを決めます: `minY` = 本体の最上端の要素の y から `32` を引いた値(4の倍数に丸める)、高さ = 本体の下端に応じて選んだキャンバス高さ − `minY`。結果として上の余白は `32`、下の余白は `40`〜`120` になります。
- 座標・寸法・フォントサイズ・余白はすべて **4の倍数**にします(4pxグリッド)。**余った縦を埋めるために要素を足してはいけません**。図が小さいなら余白を切り詰めてください(複雑度上限と「消せるなら消す」の原則を守るため)。

## 複雑度上限

図の**本体**の焦点は1つ。`ok` / `ng` を使った図では**本体に** `accent` を使いません。上限はノード6・矢印8・accent1・comparisonの列2・階層3です。超えたらトピックを割ってください。
