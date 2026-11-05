---
sourceRefs: [SRC-claude-docs-vision-20261031, SRC-claude-docs-pdf-20261031]
id: 2-4-2
title: 画像と PDF を渡す
takeaway: "画像と PDF は、content のブロックとして渡します。"
introduces: [image ブロック, document ブロック]
requires: [content, file_id]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 画像と PDF を渡す
<!-- ノート: 文字以外の資料を Claude に渡す方法を確かめます。 -->
---
# 画像を文字で説明していた
グラフの画像の内容を、人が文章に書き起こしてから送っていました。
<!-- ノート: 書き起こす手間がかかり、細かい情報も落ちます。 -->
---
# ブロックとして渡す
画像と PDF は、content のブロックとして渡します。
<!-- ノート: 画像は image ブロック、PDF は document ブロックです。 -->
---
# 画像と質問を並べる
```js
const content = [
  { type: "image", source: { type: "base64", media_type: "image/png", data: pngBase64 } },
  { type: "text", text: "このグラフの傾向を説明して" },
];
```
<!-- ノート: 画像を先に、質問をあとに並べると、よい結果になりやすいとされています。 -->
---
# source の 3 つの渡し方
- base64 で、中身をリクエストに入れる
- URL で、公開している場所を指す
- file_id で、Files API に上げたものを指す
<!-- ノート: クラウド各社の経由では、base64 しか使えないことがあります。 -->
---
<!-- _class: summary -->
# まとめ
画像と PDF は、content のブロックとして渡します。
<!-- ノート: この単元はここまでです。知識問題と課題で確かめます。 -->
