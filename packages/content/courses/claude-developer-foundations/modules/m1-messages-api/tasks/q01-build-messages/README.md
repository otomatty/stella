# 会話の履歴を組み立てる

社内ヘルプデスクのチャットで、Messages API に送るリクエストを組み立てます。`src/conversation.js` の 2 つの関数を完成させてください。

## 作るもの

### `buildRequest(history, userText, options)`

これまでのやり取り `history` と、利用者の新しい発言 `userText` から、Messages API のリクエストを返します。

- `messages` は、`history` のあとに新しい発言を `{ role: "user", content: userText }` として足した配列にします。
- 役割の指示 `options.system` は `system` に置き、`messages` に混ぜません。
- `model` と `max_tokens` には `options.model` と `options.maxTokens` を入れます。
- 渡された `history` の配列は書き換えません(呼び出し側が同じ履歴を使い続けるため)。

```js
buildRequest(
  [
    { role: "user", content: "注文の状況を教えて" },
    { role: "assistant", content: "注文番号を教えてください" },
  ],
  "A-1024 です",
  { model: "claude-opus-5-5", system: "あなたは社内ヘルプデスクの担当者です", maxTokens: 1024 },
);
// => {
//   model: "claude-opus-5-5",
//   max_tokens: 1024,
//   system: "あなたは社内ヘルプデスクの担当者です",
//   messages: [ …それまでの 2 件, { role: "user", content: "A-1024 です" } ],
// }
```

### `textOf(response)`

応答の `content` から、`type` が `"text"` のブロックの `text` を順につないだ文字列を返します。テキスト以外のブロックは飛ばし、`content` が空なら `""` を返します。

```js
textOf({ content: [{ type: "text", text: "注文 A-1024 は" }, { type: "text", text: "明日届きます。" }] });
// => "注文 A-1024 は明日届きます。"
```

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません(テストは応答の形をした値を渡します)。テストと設定のファイルは書き換えません。
