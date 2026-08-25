# モダンCSS 入門研修 カリキュラム

HTML/CSS 入門研修(`html-css-basics`)の次に受ける中間講座です。1 トピック = 覚えることが 1 つ(takeaway 1 文)の粒度で、
入門で作った 1 枚のページを、**新しい部品を足さずに**、現代の CSS の書き方で見た目だけやり直します。
構成は [MDN Web ドキュメント](https://developer.mozilla.org/) の各リファレンスと Learn web development に合わせています。

想定する受講順は `html-css-basics` → **本講座** → `ui-components-basics` → `page-composition-basics` です。

## 終了時の目標

終了時、受講者は HTML/CSS 入門で作った既存の 1 枚のページを、新しい部品を足さずに、見た目だけ作り直せます。

- 色と余白の値を `:root` のカスタムプロパティ(デザイントークン)にまとめ、`var()` で参照できる
- 色を `oklch()` で書き、`color-mix()` で明るさ違いの色を派生できる
- 部品ごとのルールを CSS の入れ子と `&` でまとめ、`>`・`+`・属性セレクタ・`:has()` で当てる相手を絞れる
- 余白と寸法を論理プロパティ(`margin-inline` / `inline-size` / `inset`)で書ける
- 文字サイズを `clamp()` の流体タイプにし、1 行の長さを `max-inline-size` と `ch` で抑えられる
- `outline: none` だけで終わらせず、`:focus-visible` でフォーカスの枠を整えられる

## 進め方と範囲

- Web(LMS): スライド視聴・まとめ・確認クイズ(合格点 80)
- 手を動かす部分: `practice.md` の「手元で試す」。HTML/CSS 入門で作った `index.html` / `style.css` に手を入れ、ブラウザーで確かめる
- コード演習(VS Code 拡張の採点)は **この講座にはありません**。見た目の採点は現時点の採点基盤の対象外です

対象外:

- 新しい UI 部品の追加、JavaScript / DOM、CSS フレームワーク、ビルドツール
- `@layer`(カスケードレイヤー)、コンテナクエリ、本格的なレスポンシブ設計
- SVG、iframe、段組み
- `@property`(Baseline が Newly のため)
- 8pt グリッドなどの余白スケールの体系論(公式 Learn に手順が無いため。段階を絞る考え方だけを扱う)
- HTML/CSS 入門で扱った内容の再講義(Grid・擬似クラスの導入・単位の基礎など)

## 全体構成(4 モジュール / 9 レッスン / 28 トピック)

### M1. デザイントークン — レッスン1-1 カスタムプロパティ

| ID | トピック | takeaway |
| --- | --- | --- |
| 1-1-1 | カスタムプロパティは値に名前を付ける | --で始まる名前のプロパティを書くと、CSSの値に自分で名前を付けて覚えさせられる |
| 1-1-2 | var()で名前から値を取り出す | var()にカスタムプロパティの名前を渡すと、覚えさせた値を取り出して使える |
| 1-1-3 | :rootに置くとページ全体で使える | カスタムプロパティは子に継承されるので、:rootに置くとページ全体で使える |
| 1-1-4 | 同じ名前を書き直すと、その中だけ変わる | 要素の中でカスタムプロパティを定義し直すと、その要素の中だけ値が変わる |

### M1. デザイントークン — レッスン1-2 色の今どきの書き方

| ID | トピック | takeaway |
| --- | --- | --- |
| 1-2-1 | oklch()は明るさから色を作る | oklch()は、明るさ・鮮やかさ・色相の3つの数字で色を書く |
| 1-2-2 | color-mix()は2つの色を混ぜる | color-mix()は、2つの色を指定した割合で混ぜた色を作る |
| 1-2-3 | 色は役割の名前でトークンにする | 色は:rootのカスタムプロパティに役割の名前を付けて、トークンとして使い回す |

### M2. 現代の書き方 — レッスン2-1 入れ子で書く

| ID | トピック | takeaway |
| --- | --- | --- |
| 2-1-1 | ルールの中にルールを書ける | ルールの中にルールを書くと、外側のセレクタの中にある要素だけに当たる |
| 2-1-2 | &は外側のセレクタ自身を指す | &は外側のセレクタ自身を指し、:hoverのような状態の指定を入れ子の中に書ける |
| 2-1-3 | 入れ子は部品のまとまりに留める | 入れ子は部品1つのまとまりまでにして、深くしない |

### M2. 現代の書き方 — レッスン2-2 論理プロパティ

| ID | トピック | takeaway |
| --- | --- | --- |
| 2-2-1 | 余白は流れの向きで書ける | margin-inlineは、文章が流れる向きを基準に左右の余白をまとめて指定する |
| 2-2-2 | 幅はinline-sizeで書ける | inline-sizeは、文章が流れる向きの寸法を表すwidthの論理版 |
| 2-2-3 | 位置の距離はinsetでまとめる | positionで使うtop・right・bottom・leftは、insetでまとめて書ける |

### M2. 現代の書き方 — レッスン2-3 セレクタを広げる

| ID | トピック | takeaway |
| --- | --- | --- |
| 2-3-1 | >は直下の子だけに当たる | >でつないだセレクタは、中身全部ではなく直下の子だけに当たる |
| 2-3-2 | +は直後の要素に当たる | +でつないだセレクタは、同じ親の中で直後に続く要素だけに当たる |
| 2-3-3 | 属性セレクタは属性の値で選ぶ | 角かっこのセレクタは、要素に付いている属性とその値で当てる相手を選ぶ |
| 2-3-4 | :has()は中身で親を選ぶ | :has()は、中に何があるかを条件にして、囲んでいる側の要素を選べる |

### M3. 仕上げの調整 — レッスン3-1 流体タイプ

| ID | トピック | takeaway |
| --- | --- | --- |
| 3-1-1 | vwだけの文字サイズは拡大できない | font-sizeをvwだけで書くと、利用者が文字を拡大できなくなる |
| 3-1-2 | clamp()で下限と上限を決める | clamp()は最小・普段・最大の3つの値で、画面幅に応じて滑らかに変わる文字サイズを作る |
| 3-1-3 | 1行の長さはchで抑える | max-inline-sizeをchで指定すると、1行の文字数を読める長さに抑えられる |

### M3. 仕上げの調整 — レッスン3-2 余白トークンと画像の収め方

| ID | トピック | takeaway |
| --- | --- | --- |
| 3-2-1 | 余白は段階を決めてトークンにする | 余白の値は少ない段階に絞って、:rootのトークンにする |
| 3-2-2 | 画像はmax-widthで箱に収める | imgにmax-width: 100%を当てると、画像が置いた箱の幅からはみ出さなくなる |
| 3-2-3 | 収め方はobject-fitで決める | 枠と比率が合わない画像をどう収めるかは、object-fitで決める |

### M3. 仕上げの調整 — レッスン3-3 フォーカスの見た目

| ID | トピック | takeaway |
| --- | --- | --- |
| 3-3-1 | :focus-visibleは必要なときだけ枠を出す | :focus-visibleは、キーボード操作のようにフォーカスの枠が必要なときだけ当たる |
| 3-3-2 | 枠は消すだけにしない | outline: noneで枠を消すなら、:focus-visibleで代わりの枠を必ず用意する |

### M4. 作り直しの実践 — レッスン4-1 既存ページをやり直す

| ID | トピック | takeaway |
| --- | --- | --- |
| 4-1-1 | 作り直しは値の棚卸しから始める | 作り直しは、いまのCSSに散らばった色と余白の値を書き出して、段階に絞ることから始める |
| 4-1-2 | 宣言をトークンの参照に置き換える | 棚卸しした値を:rootのトークンにまとめ、各宣言をvar()の参照に置き換える |
| 4-1-3 | 部品のルールは入れ子にまとめ直す | 同じ部品に当てているルールは、入れ子で1つのまとまりに書き直す |

## この講座の進め方

- 各レッスンは **スライド → まとめ → 確認クイズ** の順で並びます
- `practice.md` の「手元で試す」はテキストエディタとブラウザーだけで完結します。自動採点はありません
- スマートフォンからでも、スライドとまとめと確認クイズだけで最後まで進められます

## 今後の拡張(この講座の外)

- `ui-components-basics`(UI 部品を段階的に作る講座)・`page-composition-basics`(ページ構成の講座)が後続
- 見た目の自動採点(プレビュー一致)。採点基盤の整備が先

## クレジット(原典)

この講座は、次の公開ドキュメントを参照して未経験者向けに順序・粒度を再設計した独自教材です。
翻訳・転載ではありません。原典への言及はこのファイルに集約し、スライド・`doc.md` 本文には書きません。

| 役割 | 正本 | ライセンス |
| --- | --- | --- |
| リファレンス | [MDN Web ドキュメント(CSS)](https://developer.mozilla.org/ja/docs/Web/CSS) | CC-BY-SA 2.5 |
| 学習経路 | [MDN ウェブ開発の学習](https://developer.mozilla.org/ja/docs/Learn_web_development) | CC-BY-SA 2.5 |
| 流体タイポグラフィ | [web.dev Learn Design: Typography](https://web.dev/learn/design/typography/) | CC-BY 4.0 |
| 英語正本 | [mdn/content](https://github.com/mdn/content) | CC-BY-SA 2.5 |

主な参照ページ:

- [カスタムプロパティ(`--*`)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) / [CSS カスタムプロパティの使用](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [`oklch()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch) / [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
- [入れ子セレクタ `&`](https://developer.mozilla.org/en-US/docs/Web/CSS/Nesting_selector)
- [テキスト方向の違いの操作(論理プロパティ)](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Handling_different_text_directions)
- [結合子](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Combinators) / [属性セレクタ](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Attribute_selectors) / [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [画像・メディア・フォーム要素](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Images_media_form_elements)
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
