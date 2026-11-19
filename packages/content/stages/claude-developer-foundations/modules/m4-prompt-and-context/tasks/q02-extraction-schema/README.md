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
- `system` に、取り出す項目と欠損時の値を自分の言葉で書きます。デモ希望は明記されたときだけ `true`、希望日はデモについて指定された日だけを採ります。
- `messages` は `user` の発言 1 つで、`content` はメールを `<email>` のタグで包んだ文字列(`<email>`、改行、本文、改行、`</email>`)です。
- `output_config.format` に `{ type: "json_schema", schema: inquirySchema }` を書きます。

### `readInquiry(message)`

構造化出力の応答を読みます。

- `stop_reason` が `"end_turn"` でなければ、JSON として読まずに `{ ok: false, reason: stop_reason の値 }` を返します。
- `"end_turn"` なら、`content` のテキストのブロックをつないで JSON として読みます。後述の確認に通れば `{ ok: true, data }` を返します。
- JSON として読めなければ、例外にせず `{ ok: false, reason: "invalid_json" }` を返します。
- 営業台帳では、以前に保存した応答も同じ関数に渡します。`null` や配列、5 項目の不足・余分な項目・型違いは `{ ok: false, reason: "invalid_shape" }` にします。`plan` は小文字にそろえた値がスキーマの候補にあるか、日付は `null` か `YYYY-MM-DD` の文字列かを確かめます。この課題では実在する日付かの再検査は不要です。
- 読めたら営業台帳に登録できるかを確かめます。`wants_demo` が `false` なのに `preferred_date` が入っていれば、担当者がメールを見直すため、`{ ok: false, reason: "date_without_demo" }` を返します。希望の有無や日付を関数内で補正しません。`wants_demo` が `true` で日付が `null` の場合は、日程が決まっていない問い合わせとして受け付けます。
- `enum` の値は、大文字と小文字の違いまでは保証されません。`data.plan` は小文字にそろえて返します。

```js
readInquiry({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"name": "山田' }] });
// => { ok: false, reason: "max_tokens" }
```

## 説明欄に書くこと

提出の説明欄に、書かれていない項目をどう表したかと、JSON として読む前に確かめたことを書きます。さらに、同じスキーマに合う「日程未定の希望」と「希望と日付の食い違い」について、入力と判定結果を一組ずつ示してください。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません。テストは、代表的な出力がスキーマに合うか・合わないかも確かめます。テストと設定のファイルは書き換えません。

作ったリクエストを本物の API に送り、いくつかのメールで出力を確かめるのは任意です(費用がかかります)。
