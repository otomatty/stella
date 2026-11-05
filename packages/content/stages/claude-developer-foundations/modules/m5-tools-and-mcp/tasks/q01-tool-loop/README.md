# ツール使用のループを回す

在庫を調べるツールを持つアシスタントの、ツール使用のループを書きます。`src/tool-loop.js` の `runToolLoop(options)` を書き直してください。いまの実装は、最初の呼び出しを 1 回実行するだけで、結果を Claude に返していません。

## 作るもの

`runToolLoop({ send, request, handlers, maxTurns })` は、Claude がツールを呼ぶ間、ツールを実行して結果を返し、最後の答えを返します。

| 値 | 中身 |
| --- | --- |
| `send` | リクエストを送り、応答(`{ stop_reason, content }`)を返す関数。テストでは偽の関数を渡す |
| `request` | 最初のリクエスト(`model`・`max_tokens`・`tools`・`messages` など) |
| `handlers` | ツールの名前ごとの関数。`input` を受け取り、結果の文字列を返す(`async`) |
| `maxTurns` | 送る回数の上限。省略したら 5 |

- 毎回、`request` のほかの項目はそのままに、`messages` だけを会話の履歴にして `send` を呼びます。受け取った `request` と `request.messages` は書き換えません。
- 応答の `content` は、そのまま assistant の発言として履歴に足します。
- `stop_reason` が `"tool_use"` なら、`content` の `tool_use` ブロックを順に実行します。
  - `handlers[name]` に `input` を渡して実行し、`{ type: "tool_result", tool_use_id: ブロックの id, content: 結果 }` を作ります。
  - `handlers` にない名前なら、実行せずに、名前を含む文と `is_error: true` を持つ `tool_result` にします。
  - すべての結果を、1 つの user の発言(`content` が `tool_result` の配列)として履歴に足し、次を送ります。
- `stop_reason` が `"tool_use"` 以外なら、ループを終えて `{ stopReason, text, messages, turns }` を返します。`text` は最後の応答のテキストのブロックをつないだ文字列、`messages` は最後の応答まで足した履歴、`turns` は `send` を呼んだ回数です。
- `maxTurns` 回送っても `"tool_use"` が続くときは、それ以上送らず、`stopReason` を `"max_turns"`、`text` を空文字にして返します。

ツールの関数が例外を投げたときの扱いは、この課題では決めません(次の課題で扱います)。

```js
const result = await runToolLoop({ send, request, handlers: { get_stock: async ({ sku }) => "12" } });
// tool_use → 実行して tool_result を返す → end_turn
result.stopReason; // => "end_turn"
result.turns; // => 2
```

## 説明欄に書くこと

提出の説明欄に、結果と呼び出しをどう結んだか(`tool_use_id`)と、ループが必ず止まる理由を、自分のコードの箇所に即して書きます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません(テストは偽の `send` を渡します)。テストと設定のファイルは書き換えません。

`send` に SDK の `client.messages.create` を渡し、本物の API で動かしてみるのは任意です(費用がかかります)。
