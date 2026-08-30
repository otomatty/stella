# UI部品 入門 カリキュラム

モダンCSS 入門(`modern-css-basics`)の次に受ける講座です。1 トピック = 覚えることが 1 つ(takeaway 1 文)の粒度で、
代表的な UI 部品を **HTML と CSS だけで、部品ごとに段階的に** 作ります。
構成は [MDN Web ドキュメント](https://developer.mozilla.org/) の CSS レイアウトクックブックと Learn web development に合わせています。

想定する受講順は `html-css-basics` → `modern-css-basics` → **本講座** → `page-composition-basics` です。
前提講座: モダンCSS 入門(`modern-css-basics`)。修了していないと本講座は開きません(スキルツリーのハードロック)。

## 終了時の目標

終了時、受講者は代表的な UI 部品を 1 つずつ、**HTML 骨格 → レイアウト → トークン → 状態** の順で仕上げられます。

- 部品の中身を意味の合う要素で囲み、HTML だけの骨格をまず作れる
- 部品の並べ方(縦積み・横並び・端寄せ)を、レシピとして必要な指定だけで書ける
- 色・余白・角丸を `--` のトークンにまとめ、部品どうしで見た目をそろえられる
- ホバー・フォーカス・現在地・選択済み・開閉といった状態を、`:focus-visible` や属性セレクタで描き分けられる
- `details` / Popover API / 宣言的な `dialog` を使い、JavaScript を書かずに開閉する部品を作れる

## 進め方と範囲

- Web(LMS): スライド視聴・まとめ・確認クイズ(合格点 80)
- 手を動かす部分: `practice.md` の「手元で試す」。`index.html` / `style.css` に部品を足し、ブラウザーで確かめる
- コード演習(VS Code 拡張の採点)は **この講座にはありません**。見た目の採点は現時点の採点基盤の対象外です

全部品に共通の段階パターン:

1. **HTML 骨格** — 意味の合う要素で中身を囲む。ここでは CSS を当てない
2. **レイアウト** — 並べ方をレシピとして書く(flex / grid の再講義はしない)
3. **トークン** — `:root` の `--` を参照して、色・余白・角丸を当てる
4. **状態** — `:hover` / `:focus-visible` / 属性セレクタ / 開閉のセレクタで、状態ごとの見た目を描く

対象外:

- JavaScript / DOM / `showModal()` の手書き / 自前のフォーカストラップ
- WAI-ARIA APG の対話ウィジェット(タブ・メニュー・コンボボックス・カルーセル)
- React などのコンポーネントライブラリ、CSS フレームワーク
- カードを並べる集合グリッド(後続の `page-composition-basics` の範囲)
- Interest invokers、`select` のフル書式化(Baseline に入っていないため)
- チェックボックスハック(`input` を隠して開閉を作る書き方)
- HTML/CSS 入門・モダンCSS 入門で扱った内容の再講義(flex・grid・`var()` の導入など)

## Baseline の注記

M4 で扱う 2 つの API は、MDN Baseline が **Newly available**(2026-08-25 時点)です。

| 機能 | 状態 | 扱い |
| --- | --- | --- |
| [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) | Baseline Newly available | 本講座で扱う |
| [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)(`command` / `commandfor`) | Baseline Newly available | 本講座で扱う |

古いブラウザーでは動きません。**動かない環境では書いた結果の確認に留め、フォールバックの JavaScript は書きません**
(この講座の範囲は HTML と CSS だけです)。業務で採用するかは、対象ブラウザーの範囲を見て各案件で判断してください。

## 全体構成(4 モジュール / 11 レッスン / 44 トピック)

### M1. 情報のかたまり — レッスン1-1 カード

| ID | トピック | takeaway |
| --- | --- | --- |
| 1-1-1 | カードはarticleで1つに囲む | カードは、見出し・本文・リンクをarticleで1つに囲んだ部品 |
| 1-1-2 | カードの中身は縦に積む | カードの中身はflex-direction: columnで縦に積み、間隔はgapで空ける |
| 1-1-3 | 色と余白はトークンで当てる | カードの色と余白は、:rootに置いたトークンをvar()で参照して当てる |
| 1-1-4 | 状態は押せる要素に当てる | カードの状態は、押せる要素に当てて部品の入れ子の中に書く |

### M1. 情報のかたまり — レッスン1-2 メディアオブジェクト

| ID | トピック | takeaway |
| --- | --- | --- |
| 1-2-1 | メディアオブジェクトは画像と本文 | メディアオブジェクトは、画像と本文が横に並ぶ2つの中身だけの部品 |
| 1-2-2 | 横並びは上端でそろえる | メディアオブジェクトはflexで横に並べ、align-items: flex-startで上端にそろえる |
| 1-2-3 | 画像の幅はトークンで決める | 画像の幅と本文との間隔は、トークンの値をvar()で当てて決める |
| 1-2-4 | 全体を押させるなら囲みごとリンクにする | メディアオブジェクト全体を押させたいときは、囲みごとリンクにして状態を当てる |

### M2. ナビゲーション — レッスン2-1 スプリットナビ

| ID | トピック | takeaway |
| --- | --- | --- |
| 2-1-1 | ナビはnavとulで書く | ナビゲーションは、navの中のulにリンクを1つずつ並べて書く |
| 2-1-2 | 離す項目はautoマージンで寄せる | 横並びのナビは、離したい項目にmargin-inline-start: autoを当てると端へ寄る |
| 2-1-3 | リンクの見た目をトークンでそろえる | ナビのリンクの色と余白は、トークンで全項目そろえる |
| 2-1-4 | ナビのリンクの状態を描く | ナビのリンクは&:hoverで色を変え、&:focus-visibleで枠を出す |

### M2. ナビゲーション — レッスン2-2 パンくずリスト

| ID | トピック | takeaway |
| --- | --- | --- |
| 2-2-1 | パンくずは順番のあるol | パンくずリストは、上の階層から順にnavの中のolで並べる |
| 2-2-2 | 区切り記号は::afterで足す | パンくずの区切り記号は文字として書かず、::afterで表示だけ足す |
| 2-2-3 | 主従はトークンの濃さで付ける | パンくずの文字と区切りは、濃さの違うトークンで主従を付ける |
| 2-2-4 | 現在地はaria-currentで示す | 現在地の項目はaria-current="page"で示し、その属性セレクタで見た目を変える |

### M2. ナビゲーション — レッスン2-3 ページネーション

| ID | トピック | takeaway |
| --- | --- | --- |
| 2-3-1 | ページ送りもnavとolで書く | ページ送りは、navの中のolに前後と番号のリンクを並べて書く |
| 2-3-2 | 番号は横並びで置く位置を決める | ページ送りの番号はflexで横に並べ、justify-contentで置く位置を決める |
| 2-3-3 | 押せる大きさをトークンで確保する | 番号のリンクは、トークンの余白と最小の寸法で押せる大きさを確保する |
| 2-3-4 | 現在のページはリンクにしない | 現在のページはリンクにせず、aria-currentを付けて見た目を反転する |

### M3. フォームと開閉 — レッスン3-1 フォーム部品の骨格

| ID | トピック | takeaway |
| --- | --- | --- |
| 3-1-1 | selectは選択肢から選ばせる | selectは、optionで並べた選択肢から1つ選ばせる入力部品 |
| 3-1-2 | textareaは複数行を書かせる | textareaは複数行の入力欄で、初期値は開始タグと終了タグの間に書く |
| 3-1-3 | radioは1つ、checkboxは複数 | 同じnameのラジオボタンは1つだけ選べ、チェックボックスはそれぞれ独立して選べる |
| 3-1-4 | fieldsetで関連する入力をまとめる | 関連する入力はfieldsetで囲み、legendでそのまとまりの見出しを付ける |
| 3-1-5 | buttonのtypeを書き分ける | フォームの中のbuttonは、送信ならsubmit、それ以外はtypeをbuttonにする |

### M3. フォームと開閉 — レッスン3-2 フォーム部品の見た目

| ID | トピック | takeaway |
| --- | --- | --- |
| 3-2-1 | 1行1組で縦に積む | フォームはラベルと入力欄を1組にして、縦に積んで並べる |
| 3-2-2 | 既定の見た目を他の部品にそろえる | 入力欄は既定の見た目を持つので、書体を継承させてトークンで枠を当て直す |
| 3-2-3 | フォーカスは:focus-visibleで出す | 入力欄のフォーカスは、枠を消したままにせず:focus-visibleで出し直す |
| 3-2-4 | 選択と操作不可を状態で描く | 選ばれている・操作できないという状態は、:checkedと:disabledで見た目を変える |

### M3. フォームと開閉 — レッスン3-3 detailsで開閉する

| ID | トピック | takeaway |
| --- | --- | --- |
| 3-3-1 | detailsはJavaScriptなしで開閉する | detailsとsummaryは、JavaScriptなしで開閉できる部品を作る |
| 3-3-2 | summaryの印は置き換えられる | summaryの既定の三角は::markerで消して、自分の印に置き換えられる |
| 3-3-3 | 開閉の枠と余白をトークンで当てる | detailsの枠・余白・角丸はトークンで当てて、他の部品とそろえる |
| 3-3-4 | 開いている間は[open]で選ぶ | 開いているdetailsは[open]の属性セレクタで選び、見た目を変えられる |

### M4. 重ねて出す部品 — レッスン4-1 ポップオーバー

| ID | トピック | takeaway |
| --- | --- | --- |
| 4-1-1 | popoverは属性2つで開閉する | popover属性を付けた要素は、popovertargetで指すボタンだけで開閉できる |
| 4-1-2 | ポップオーバーは最前面に出る | ポップオーバーは最前面に出るので、位置はinsetとmarginで決める |
| 4-1-3 | 中身の見た目はトークンで当てる | ポップオーバーの余白・角丸・境界はトークンで当てて、他の部品とそろえる |
| 4-1-4 | 開いている間は:popover-open | 開いているポップオーバーは:popover-openで選び、見た目を変えられる |

### M4. 重ねて出す部品 — レッスン4-2 ダイアログを開く

| ID | トピック | takeaway |
| --- | --- | --- |
| 4-2-1 | dialogは既定で閉じている | dialogは既定で閉じていて、開くまでページに表示されない |
| 4-2-2 | commandでモーダルに開く | command="show-modal"のボタンは、commandforで指すdialogをモーダルで開く |
| 4-2-3 | 中のボタンでcloseする | ダイアログの中にcommand="close"のボタンを置くと、そのボタンで閉じられる |
| 4-2-4 | モーダルは背面を止める | モーダルで開いたダイアログは、背面を操作できずEscキーで閉じられる |

### M4. 重ねて出す部品 — レッスン4-3 ダイアログの見た目

| ID | トピック | takeaway |
| --- | --- | --- |
| 4-3-1 | 幅と位置は論理プロパティで決める | ダイアログの幅と位置は、max-inline-sizeとmargin: autoで決める |
| 4-3-2 | 中身はトークンで組む | ダイアログの余白・境界・角丸は、他の部品と同じトークンで当てる |
| 4-3-3 | 背面の暗さは::backdrop | モーダルの背面の暗さは::backdropで指定する |

## この講座の進め方

- 各レッスンは **スライド → まとめ → 確認クイズ** の順で並びます
- `practice.md` の「手元で試す」はテキストエディタとブラウザーだけで完結します。自動採点はありません
- スマートフォンからでも、スライドとまとめと確認クイズだけで最後まで進められます

## 今後の拡張(この講座の外)

- `page-composition-basics`(部品を並べて 1 ページに組み立てる講座)が後続
- WAI-ARIA APG の対話ウィジェット(タブ・メニュー)は JavaScript を扱う講座で
- 見た目の自動採点(プレビュー一致)。採点基盤の整備が先

## クレジット(原典)

この講座は、次の公開ドキュメントを参照して未経験者向けに順序・粒度を再設計した独自教材です。
翻訳・転載ではありません。原典への言及はこのファイルに集約し、スライド・`doc.md` 本文には書きません。

| 役割 | 正本 | ライセンス |
| --- | --- | --- |
| レイアウトのレシピ | [MDN CSS レイアウトクックブック](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook) | CC-BY-SA 2.5 |
| リファレンス | [MDN Web ドキュメント(HTML)](https://developer.mozilla.org/ja/docs/Web/HTML) | CC-BY-SA 2.5 |
| 学習経路 | [MDN ウェブ開発の学習](https://developer.mozilla.org/ja/docs/Learn_web_development) | CC-BY-SA 2.5 |
| 英語正本 | [mdn/content](https://github.com/mdn/content) | CC-BY-SA 2.5 |

主な参照ページ:

- [Card](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Card) / [Media objects](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Media_objects)
- [Split Navigation](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Split_Navigation) / [Breadcrumb Navigation](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Breadcrumb_navigation) / [Pagination](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Pagination)
- [ウェブフォーム](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms) / [フォームの構築](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/HTML_forms)
- [`details`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) / [`summary`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary)
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) / [`dialog`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) / [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)
