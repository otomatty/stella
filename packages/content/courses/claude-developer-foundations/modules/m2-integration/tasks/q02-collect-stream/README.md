# ストリームから本文を組み立てる

ストリーミングで届いたイベントの列から、本文と止まった理由を組み立てます。`src/stream.js` の `collectStream(events)` を直してください。いまの実装は、ツールの入力の差分まで本文につなぎ、止まった理由も返しません。

## 作るもの

`collectStream(events)` は、届いた順のイベントの配列を受け取り、`{ text, stopReason }` を返します。

- `text` は、`type` が `"content_block_delta"` で、`delta.type` が `"text_delta"` のイベントの `delta.text` を、届いた順につないだ文字列です。
- ツールの入力の差分(`delta.type` が `"input_json_delta"`)は、本文に入れません。
- `stopReason` は、`type` が `"message_delta"` のイベントの `delta.stop_reason` です。まだ届いていなければ `null` にします。
- `ping` や、知らない種類のイベントは読み飛ばします(新しい種類が足されることがあるため)。

```js
collectStream([
  { type: "message_start", message: { content: [], stop_reason: null } },
  { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
  { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "注文 A-1024 は" } },
  { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "明日届きます。" } },
  { type: "content_block_stop", index: 0 },
  { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 15 } },
  { type: "message_stop" },
]);
// => { text: "注文 A-1024 は明日届きます。", stopReason: "end_turn" }
```

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません(テストはイベントの形をした値を渡します)。テストと設定のファイルは書き換えません。
