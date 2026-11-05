---
sourceRefs: [SRC-claude-docs-files-20261031, SRC-claude-docs-vision-20261031, SRC-claude-docs-pdf-20261031]
---
# レッスン2-4 ファイル・画像・PDF

## このレッスンの目標

- [ ] Files API を使う場面と、file_id の扱いの注意を説明できます。
- [ ] 画像と PDF を content のブロックとして組み立てられます。

## 2-4-1 何度も使うファイル

> **何度も使うファイルは、Files API に上げて ID で指します。**

Files API は、ファイルを一度上げて何度も使うための API です。上げると `file_id` が返り、以後のリクエストではファイルの中身の代わりにこの ID を書きます。同じ資料について何度も質問するときに、毎回ファイルを送る手間とリクエストの大きさを減らせます。

```js
const block = {
  type: "document",
  source: { type: "file", file_id: uploadedFile.id },
};
```

上げたファイルは、利用者や会話ごとに分かれていません。同じワークスペースの API キーなら、どれからでも読めます。そのため、利用者から受け取った `file_id` をそのまま使ってはいけません。ほかの利用者が上げたファイルを読ませてしまうおそれがあります。どの利用者のファイルかは、自分のアプリで対応を持ちます。

## 2-4-2 画像と PDF を渡す

> **画像と PDF は、content のブロックとして渡します。**

画像は `image` ブロック、PDF は `document` ブロックとして、質問の文字と一緒に content に並べます。画像を先に、質問をあとに並べると、よい結果になりやすいとされています。

```js
const content = [
  { type: "image", source: { type: "base64", media_type: "image/png", data: pngBase64 } },
  { type: "text", text: "このグラフの傾向を説明して" },
];
```

ブロックの `source` には、3 つの渡し方があります。

| `source.type` | 渡すもの | 向く場面 |
| --- | --- | --- |
| `base64` | 中身を base64 にした文字列 | 手元のファイルを送る |
| `url` | 公開している場所の URL | ネット上にある資料を指す |
| `file` | Files API の `file_id` | 同じファイルを何度も使う |

Amazon Bedrock と Google Cloud 経由では、いまは base64 しか使えません。使う提供元に合わせて選びます。

## もっと知りたい人へ

- [Files API](https://platform.claude.com/docs/en/build-with-claude/files) — ファイルを上げて file_id で使う仕組みと注意(英語)
- [Vision](https://platform.claude.com/docs/en/build-with-claude/vision) — 画像の渡し方(英語)
- [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — PDF の渡し方(英語)

知識問題で、このレッスンの内容を確かめます。
