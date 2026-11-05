# 抽出のスキーマを書く

問い合わせのメールから、営業が使う項目を構造化出力で取り出します。`src/inquiry.js` の `inquirySchema` と 2 つの関数を直してください。いまの実装は、スキーマを指示の文に貼っているだけで構造化出力を使っておらず、書かれていない項目の扱いも決めていません。応答もそのまま JSON として読んでいます。

## 作るもの

### `inquirySchema`

取り出す項目の JSON スキーマです。次の 5 つの項目を持つオブジェクトにします。

| 項目 | 中身 | 書かれていないとき |
| --- | --- | --- |
| `name` | 送り主の名前(文字列) | `null` |
| `email` | 返信先のメールアドレス(文字列) | `null` |
| `plan` | 関心のあるプラン。`"basic"`・`"pro"`・`"enterprise"` のどれか | `"unknown"` |
| `wants_demo` | デモを希望しているか(真偽値) | `false` |
| `preferred_date` | デモの希望日(`YYYY-MM-DD` の文字列。`format: "date"` を書く) | `null` |

- 5 つの項目をすべて必須にします(必須でない項目は、出力で後ろに回ったり、省かれたりします)。
- オブジェクトには `additionalProperties: false` を書きます。
- 構造化出力で使えない制限(`minLength`・`maxLength`・`minimum`・`maximum` など)は書きません。書くと 400 エラーになります。
- 項目に `description` を書くと、Claude に項目の意味が伝わります(任意)。

### `buildInquiryRequest(input)`

`input` の `model`・`maxTokens`・`email`(メールの本文)から、リクエストを作ります。

- `model` と `max_tokens` を書きます。
- `system` に、取り出す項目と「書かれていない項目は推測せず、`null` か `unknown` にする」ことを、自分の言葉で書きます。
- `messages` は `user` の発言 1 つで、`content` はメールを `<email>` のタグで包んだ文字列(`<email>`、改行、本文、改行、`</email>`)です。
- `output_config.format` に `{ type: "json_schema", schema: inquirySchema }` を書きます。

### `readInquiry(message)`

構造化出力の応答を読みます。

- `stop_reason` が `"end_turn"` でなければ、JSON として読まずに `{ ok: false, reason: stop_reason の値 }` を返します。
- `"end_turn"` なら、`content` のテキストのブロックをつないで JSON として読み、`{ ok: true, data }` を返します。
- JSON として読めなければ、例外にせず `{ ok: false, reason: "invalid_json" }` を返します。
- `enum` の値は、大文字と小文字の違いまでは保証されません。`data.plan` は小文字にそろえて返します。

```js
readInquiry({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"name": "山田' }] });
// => { ok: false, reason: "max_tokens" }
```

## 説明欄に書くこと

提出の説明欄に、書かれていない項目をどう表したか(なぜ `null` や `"unknown"` にしたか)と、`readInquiry` で JSON として読む前に確かめたことを、自分のコードの箇所に即して書きます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません。テストは、代表的な出力がスキーマに合うか・合わないかも確かめます。テストと設定のファイルは書き換えません。

作ったリクエストを本物の API に送り、いくつかのメールで出力を確かめるのは任意です(費用がかかります)。
