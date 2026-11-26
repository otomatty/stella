## ヒント1 方針

文書は受け取った順に並べ、質問のテキストは最後です。引用はすべての文書で有効にします。応答は止まった理由を先に見て、そのあと引用が付いたテキストだけを残します。

## ヒント2 手がかりのコード

文書ブロックは、本文を `source.data` に入れます。引用の重複は、題名と引用文の組で除きます。

```js
const block = {
  type: "document",
  source: { type: "text", media_type: "text/plain", data: sourceDoc.text },
  title: sourceDoc.title,
  citations: { enabled: true },
};
```
