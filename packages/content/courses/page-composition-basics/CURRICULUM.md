# ページ構成 入門研修 カリキュラム

UI部品 入門研修(`ui-components-basics`)の次に受ける講座です。1 トピック = 覚えることが 1 つ(takeaway 1 文)の粒度で、
これまでの講座で作った部品と `:root` のトークンだけを使い、**1 枚の静的ページに組み立てる**ことを扱います。
構成は [MDN Web ドキュメント](https://developer.mozilla.org/) の Structuring documents・CSS レイアウトクックブックと、
[WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) の Landmarks パターンに合わせています。

想定する受講順は `html-css-basics` → `modern-css-basics` → `ui-components-basics` → **本講座** です。
前提講座: UI部品 入門研修(`ui-components-basics`)。修了していないと本講座は開きません(スキルツリーのハードロック)。

## 終了時の目標

終了時、受講者は既習の部品と `:root` のトークンだけで、`header` / `nav` / `main` / `footer` のある 1 枚の静的ページを組み立てられます。

- ページの骨格を landmark になる要素で組み、main を 1 つに保ち、内容を landmark の中に収められる
- ヘッダ・フッタを「全幅の帯 + wrapper 幅の中身」で組み、パンくずを main の先頭に置ける
- カードの集合を `repeat(auto-fill, minmax())` のグリッドで敷き詰められる
- 本文が短いページでも、フッタを画面の下端に付けられる
- 既習のポップオーバー・ダイアログを、ページに 1 つずつ載せられる
- skip link を置き、最初のフォーカスから main へ飛べるようにできる

## 進め方と範囲

- Web(LMS): スライド視聴・まとめ・確認クイズ(合格点 80)
- 手を動かす部分: `practice.md` の「手元で試す」。1 枚の `index.html` / `style.css` に部品を配置し、ブラウザーで確かめる
- コード演習(VS Code 拡張の採点)は **この講座にはありません**。見た目の採点は現時点の採点基盤の対象外です

この講座で新しく作る部品はありません。**部品の HTML/CSS の初出と、トークン定義の初出は置かず**、
すでに作った部品を 1 枚のページへ配置すること(骨格・幅・区画・下端・skip link)だけを扱います。

対象外:

- 部品の作り方の再講義(カード・ナビ・フォーム部品・details・popover・dialog の中身)
- JavaScript / DOM、React などのフレームワーク、CSS フレームワーク
- 本格的なレスポンシブ設計(複数ブレークポイント)。幅 1 本の `@media` の recap のみ
- WAI-ARIA APG の対話ウィジェット(タブ・メニューなど)
- 複数ページのサイト設計、ルーティング、ビルドツール

## Baseline の注記

3-1-3 / 3-1-4 で載せる Popover API と Invoker Commands API(`command` / `commandfor`)は、
UI部品 入門研修と同じく MDN Baseline が **Newly available** です。動かない環境では書いた結果の確認に留め、
フォールバックの JavaScript は書きません。2-1-4 の `subgrid` は Baseline **Widely available** です。

## 全体構成(3 モジュール / 6 レッスン / 23 トピック)

### M1. ページの骨格 — レッスン1-1 骨格を置く

| ID | トピック | takeaway |
| --- | --- | --- |
| 1-1-1 | ページはlandmarkで組む | 1枚のページの骨格は、header・nav・main・footerというlandmarkになる要素で組む |
| 1-1-2 | landmarkは増やしすぎない | mainはページに1つだけにして、landmarkは骨格の大きな区切りだけに絞る |
| 1-1-3 | 内容はlandmarkの中に置く | 目に見える内容は必ずどれかのlandmarkの中に置き、bodyへ直置きしない |
| 1-1-4 | ページのトークンは1セット | ページ全体の色と余白は、:rootに置いた1セットのトークンをvar()で参照して当てる |

### M1. ページの骨格 — レッスン1-2 ヘッダとパンくず

| ID | トピック | takeaway |
| --- | --- | --- |
| 1-2-1 | スプリットナビはheaderに載せる | 作ってあるスプリットナビは、中身を変えずにheaderの中へそのまま載せる |
| 1-2-2 | 帯は全幅、中身はwrapper | headerの帯は全幅に伸ばし、中身はwrapperで本文と同じ幅の中央にそろえる |
| 1-2-3 | パンくずはmainの先頭に置く | パンくずリストは、mainの先頭に置いて現在地までの道筋を示す |
| 1-2-4 | navはaria-labelで区別する | navが複数あるページでは、aria-labelで名前を付けてどのナビか区別する |

### M2. 本文を組む — レッスン2-1 区画とカードの集合

| ID | トピック | takeaway |
| --- | --- | --- |
| 2-1-1 | 本文はsectionで区切る | mainの中身は、h2の見出しを持つsectionの区画で区切る |
| 2-1-2 | 区画の間隔は親のgapで空ける | 区画どうしの間隔は、区画を積む親を縦のflexにしてgapでまとめて空ける |
| 2-1-3 | カードの集合はgridで敷き詰める | カードの集合は、repeat(auto-fill, minmax())のgridで幅に合わせて敷き詰める |
| 2-1-4 | subgridで行の高さをそろえる | 隣のカードと行の高さをそろえたいときは、subgridで親のgridの行を借りる |

### M2. 本文を組む — レッスン2-2 一覧・フォーム・FAQ

| ID | トピック | takeaway |
| --- | --- | --- |
| 2-2-1 | 更新情報はメディアオブジェクトで積む | 更新情報の一覧は、メディアオブジェクトを縦に積んで区切り線で区切る |
| 2-2-2 | フォームの幅は読みやすく絞る | 申し込みフォームは区画にそのまま載せ、幅はmax-inline-sizeで読みやすく絞る |
| 2-2-3 | FAQはdetailsを並べて作る | FAQの区画は、detailsを縦に並べて質問ごとに開閉できるようにする |

### M3. 下端と仕上げ — レッスン3-1 フッタとオーバーレイ

| ID | トピック | takeaway |
| --- | --- | --- |
| 3-1-1 | bodyを画面の高さまで伸ばす | 本文が短いページでは、まずbodyをmin-height: 100svhで画面の高さまで伸ばす |
| 3-1-2 | 余った高さはmainの1frに渡す | bodyを縦のgridにしてmainの行を1frにすると、余った高さをmainが受け取りfooterが下端に付く |
| 3-1-3 | popoverはページに1つ載せる | 作ってあるポップオーバーは、開くボタンごとheaderに置いてページに1つ載せる |
| 3-1-4 | dialogはページに1つ載せる | 作ってあるダイアログは、開くボタンと同じ区画に置いてモーダルで開く |

### M3. 下端と仕上げ — レッスン3-2 skip linkと仕上げ

| ID | トピック | takeaway |
| --- | --- | --- |
| 3-2-1 | skip linkでmainへ飛ばす | ページの最初にmainへ飛ぶリンクを置くと、キーボードの利用者がナビの繰り返しを飛ばせる |
| 3-2-2 | skip linkは普段は隠す | skip linkは画面の外に置いておき、フォーカスされたときだけ見える位置に戻す |
| 3-2-3 | 狭い幅は@media 1本で整える | 狭い画面向けの直しは、幅1本の@mediaにまとめて書くだけに留める |
| 3-2-4 | 仕上げは骨格の点検で終える | 仕上げに、landmarkの数・タブでの一巡・トークンが1セットかを点検して完成にする |

## この講座の進め方

- 各レッスンは **スライド → まとめ → 確認クイズ** の順で並びます
- `practice.md` の「手元で試す」はテキストエディタとブラウザーだけで完結します。自動採点はありません
- スマートフォンからでも、スライドとまとめと確認クイズだけで最後まで進められます

## 今後の拡張(この講座の外)

- WAI-ARIA APG の対話ウィジェット(タブ・メニュー)は JavaScript を扱う講座で
- 複数ブレークポイントのレスポンシブ設計・コンテナクエリ
- 見た目の自動採点(プレビュー一致)。採点基盤の整備が先

## クレジット(原典)

この講座は、次の公開ドキュメントを参照して未経験者向けに順序・粒度を再設計した独自教材です。
翻訳・転載ではありません。原典への言及はこのファイルに集約し、スライド・`doc.md` 本文には書きません。

| 役割 | 正本 | ライセンス |
| --- | --- | --- |
| 文書構造・レイアウトのレシピ | [MDN Web ドキュメント](https://developer.mozilla.org/) | CC-BY-SA 2.5 |
| landmark の原則 | [WAI-ARIA APG Landmarks](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/) | W3C Document License |
| フォーカスと skip link | [web.dev Learn Accessibility: Focus](https://web.dev/learn/accessibility/focus/) | CC-BY 4.0 |
| 英語正本 | [mdn/content](https://github.com/mdn/content) | CC-BY-SA 2.5 |

主な参照ページ:

- [Structuring documents](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Structuring_documents)
- [CSS レイアウトクックブック](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook)([Card](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Card) / [Sticky footers](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Sticky_footers) / [Split navigation](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Split_Navigation) / [Breadcrumb navigation](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Breadcrumb_navigation))
- [Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid)
- [WAI-ARIA APG Landmarks](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/)
- [web.dev Learn Accessibility: Focus](https://web.dev/learn/accessibility/focus/)
