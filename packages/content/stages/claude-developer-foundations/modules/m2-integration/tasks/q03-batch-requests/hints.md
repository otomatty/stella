## ヒント1 方針

`custom_id` は並び順ではなく、問い合わせの `id` から作ります。作った `custom_id` を `Set` に覚えておけば、重なりに気づけます。形は正規表現 `/^[a-zA-Z0-9_-]{1,64}$/` で確かめます。結果は `new Map(results.map((item) => [item.custom_id, …]))` で、`result.type` ごとに値を作ります。

## ヒント2 手がかりのコード

```js
const seen = new Set();
const customId = `ticket-${ticket.id}`;
if (seen.has(customId)) throw new Error(`問い合わせの ID が重なっています: ${ticket.id}`);
seen.add(customId);
```
