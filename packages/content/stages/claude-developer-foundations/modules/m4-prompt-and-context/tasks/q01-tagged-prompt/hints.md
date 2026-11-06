## ヒント1 方針

`<tag>`・中身・`</tag>` を改行でつなぐ小さな関数 `wrap(tag, body)` を作ると、どの節も同じ書き方で包めます。節を配列に `push` していき、最後に `join("\n\n")` でつなぎます。資料と例は、配列が空でないときだけ `push` します。`readTag` は、`indexOf` で開くタグを探し、その後ろから閉じるタグを探します。

## ヒント2 手がかりのコード

```js
function wrap(tag, body) {
  return `<${tag}>\n${body}\n</${tag}>`;
}

const block = (doc, index) =>
  [`<document index="${index + 1}">`, wrap("source", doc.source), "…", "</document>"].join("\n");
```
