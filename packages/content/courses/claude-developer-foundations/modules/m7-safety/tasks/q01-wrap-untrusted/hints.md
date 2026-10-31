## ヒント1 方針

外の内容は、文字列をつなげて組み立てず、オブジェクトのまま `JSON.stringify(item)` にします。JSON にすると、本文の引用符やタグは文字として扱われ、データの外へ抜け出せません。`toolResultTurn` は、`results` を写した配列を作り、指示があるときだけ最後に `text` ブロックを足します。

## ヒント2 手がかりのコード

```js
const content = [...results];
if (instruction) content.push({ type: "text", text: instruction });
return { role: "user", content };
```
