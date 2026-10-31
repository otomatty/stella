# キャッシュが効く順に並べる

社内の手引きに答えるアシスタントで、毎回同じ指示と資料をプロンプトキャッシュで使い回します。`src/cache.js` の 2 つの関数を直してください。いまの実装は、毎回変わる時刻と質問のブロックに `cache_control` を付けていて、キャッシュが毎回書き込みになり、読み込みが起きません。

## 作るもの

### `buildCachedRequest(input)`

`input` の値から、Messages API に送るリクエストを作ります。

| 値 | 中身 | 変わるか |
| --- | --- | --- |
| `model`・`maxTokens` | モデル ID と出力の上限 | — |
| `instructions` | 指示の文 | 毎回同じ |
| `documents` | 資料の文の配列(空のこともある) | 毎回同じ |
| `now`・`question` | 今の時刻と質問 | 毎回変わる |
| `ttl` | キャッシュの期限。`"5m"`・`"1h"` か、省略 | — |

- `model` と `max_tokens` を書きます。
- `system` には、指示、資料の順に、1 つずつ `{ type: "text", text }` のブロックにして並べます。
- `cache_control` は、毎回同じ部分の最後のブロック(資料がなければ指示のブロック)にだけ付けます。値は `{ type: "ephemeral" }` です。`ttl` が `"1h"` のときだけ `{ type: "ephemeral", ttl: "1h" }` にします。
- `messages` は、`user` の発言 1 つです。`content` は `今の時刻: <now>`、空行、質問の順につないだ文字列にします。
- 受け取った `documents` の配列は書き換えません。

```js
const request = buildCachedRequest({ ...input, documents: ["手引き 第1章"] });
request.system;
// => [
//   { type: "text", text: "社内の手引きだけを根拠に…" },
//   { type: "text", text: "手引き 第1章", cache_control: { type: "ephemeral" } },
// ]
request.messages[0].content; // => "今の時刻: 2026-10-31 09:00\n\n交通費の申請の締め切りは…"
```

### `readCacheUsage(usage)`

応答の `usage` から、キャッシュの効き方を読み取ります。

- `read` は `cache_read_input_tokens`、`written` は `cache_creation_input_tokens`、`uncached` は `input_tokens` です。キャッシュの値が `null` か省略なら 0 とします。
- `totalInput` は、入力の合計(3 つの和)です。
- `status` は、読み込みがあれば `"hit"`、読み込みがなく書き込みがあれば `"write"`、どちらもなければ `"none"` です。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません。テストと設定のファイルは書き換えません。

作ったリクエストを本物の API に 2 回続けて送り、2 回目の `usage` で `status` が `"hit"` になるかを確かめるのは任意です(費用がかかります。資料がモデルの最低の長さに届かないとキャッシュされません)。
