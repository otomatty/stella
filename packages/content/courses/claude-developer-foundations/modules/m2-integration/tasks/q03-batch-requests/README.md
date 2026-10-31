# バッチのリクエストを組み立てる

夜間に問い合わせをまとめて分類するため、Message Batches API に送るリクエストの束を作り、返ってきた結果を問い合わせと結びます。`src/batch.js` の 2 つの関数を直してください。いまの実装は、並び順を `custom_id` にしていて、結果も読める形にしていません。

## 作るもの

### `buildBatchRequests(tickets, options)`

問い合わせの一覧 `tickets`(`{ id, body }` の配列)から、リクエストの束を作ります。

- 1 件ずつ `{ custom_id, params }` にします。`custom_id` は `ticket-` に問い合わせの `id` をつないだ文字列です(例: `ticket-T-001`)。
- `params` には、`model`・`max_tokens`・`system`(`options` から)と、問い合わせの本文を `user` の発言にした `messages` を入れます。
- `custom_id` は 1〜64 文字の英数字・ハイフン・アンダースコアだけにします。使えない文字を含む問い合わせがあれば、その `id` を含むメッセージの `Error` を投げます。
- `custom_id` が重なる問い合わせがあれば、その `id` を含むメッセージの `Error` を投げます(結果を結べなくなるため)。

### `matchResults(results)`

バッチの結果の配列から、`custom_id` で引ける `Map` を作ります。結果は送った順に並ぶとは限りません。

- `result.type` が `"succeeded"` なら `{ ok: true, text }` にします。`text` は `result.message.content` のテキストのブロックをつないだ文字列です。
- それ以外(`errored`・`canceled`・`expired`)は `{ ok: false, reason: result.type }` にします。

```js
const byId = matchResults([
  { custom_id: "ticket-T-002", result: { type: "succeeded", message: { content: [{ type: "text", text: "配送" }] } } },
  { custom_id: "ticket-T-001", result: { type: "expired" } },
]);
byId.get("ticket-T-001"); // => { ok: false, reason: "expired" }
byId.get("ticket-T-002"); // => { ok: true, text: "配送" }
```

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません。テストと設定のファイルは書き換えません。
