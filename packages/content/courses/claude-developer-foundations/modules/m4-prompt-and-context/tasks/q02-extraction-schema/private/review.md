# レビューの観点

- 5 つの項目をすべて `required` に入れているか
- 書かれていない値を、文字列は `null`、`plan` は `"unknown"` で表せるようにしているか
- `additionalProperties: false` を書いているか
- `minLength`・`maxLength`・`minimum` などの使えない制限を入れていないか
- `preferred_date` に `format: "date"` を書いているか
- スキーマを指示の文ではなく `output_config.format` に渡しているか。メールを `<email>` のタグで包んでいるか
- `stop_reason` を確かめてから JSON として読んでいるか。`JSON.parse` の失敗を `invalid_json` で返しているか
- `plan` を小文字にそろえているか
- 説明欄が、書かれていない値の表し方と、読む前に確かめたことを、自分のコードに即して述べているか

よくある違反: `required` に一部しか入れない、`plan` を自由な文字列にして推測させる、`type: "string"` のまま `null` を受け付けない、`stop_reason` を見ずに `JSON.parse` して `max_tokens` の応答で例外になる、`readInquiry` の中で `plan` 以外の値まで書き換える。
