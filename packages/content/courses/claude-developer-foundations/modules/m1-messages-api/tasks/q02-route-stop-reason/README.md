# 止まった理由で処理を分ける

チャットの画面が、Claude の応答を受け取ったあとに次にすることを決めます。`src/reply.js` の `readReply(response)` を、応答の `stop_reason` で処理を分ける関数に書き直してください。

## 作るもの

`readReply(response)` は Messages API の応答を受け取り、次の表のオブジェクトを返します。本文 `text` は、`content` のうち `type` が `"text"` のブロックの `text` を順につないだ文字列です。

| `stop_reason` | 返すもの | 画面ですること |
| --- | --- | --- |
| `end_turn`・`stop_sequence` | `{ kind: "done", text }` | 答えとして表示する |
| `max_tokens`・`model_context_window_exceeded` | `{ kind: "truncated", text }` | 途中で切れたことを示し、続きを求める |
| `tool_use` | `{ kind: "tool", calls }` | ツールを実行する |
| `refusal` | `{ kind: "refused", explanation }` | 断られたことを伝える |
| 上のどれでもない値 | `{ kind: "unexpected", stopReason }` | 開発者に知らせる |

- `calls` は、`type` が `"tool_use"` のブロックを順に `{ id, name, input }` にした配列です。テキストのブロックは入れません。
- `explanation` は `stop_details.explanation` です。`stop_details` やその `explanation` が無いとき・`null` のときは `null` にします。`explanation` の文は表示に使うだけで、中身で処理を分けません(文は変わることがあります)。
- 表にない値(`pause_turn` など)を、ほかの値の扱いに混ぜません。`stopReason` に値をそのまま入れて返します。

```js
readReply({
  content: [{ type: "text", text: '{"summary": "会議の決' }],
  stop_reason: "max_tokens",
});
// => { kind: "truncated", text: '{"summary": "会議の決' }
```

## 説明欄に書くこと

提出の説明欄に、`stop_reason` ごとに返すものをどう分けたかと、表にない値を `unexpected` にした理由を、自分のコードの箇所に即して書きます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません。テストと設定のファイルは書き換えません。
