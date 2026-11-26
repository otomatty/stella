# 資料に基づく回答だけを返す

倉庫の点検案内で、渡した手引きに書いてあることだけを画面に出します。レッスン 7-3 のあとに取り組みます。`src/grounded-answer.js` の 2 つの関数を実装してください。

## 作るもの

### `buildGroundedRequest({ model, maxTokens, documents, question })`

`documents` は `{ title, text }` の配列です。戻り値は Messages API のリクエストの本文です。

- `model` と `max_tokens` には、引数の `model` と `maxTokens` を入れます。
- `system` は次の文面だけにします。

```
渡した資料だけを使って答えてください。資料に答えが無いときは、「資料に該当する記載がありません。」だけを返してください。
```

- user の発言は 1 件です。`content` には、文書のブロックを受け取った順に並べ、最後に質問の `{ type: "text", text: question }` を置きます。
- 文書のブロックは次の形です。すべての文書で引用を有効にします。`data` には `text`、`title` には `title` を入れます。

```js
{
  type: "document",
  source: { type: "text", media_type: "text/plain", data: text },
  title,
  citations: { enabled: true },
}
```

- `output_config` は付けません。引用を有効にした文書と `output_config.format` を同時に送ると、リクエストは 400 になります。引用は文の間に出典を挟むため、決まった JSON の形と同時には使えません。
- `documents` が空、または配列でなければ、`資料がありません` という `Error` を投げます。
- 受け取った `documents` は書き換えません。

```js
buildGroundedRequest({
  model: "claude-opus-5-5",
  maxTokens: 1024,
  documents: [{ title: "点検手引き", text: "棚の耐荷重は 80 kg です。屋内専用です。" }],
  question: "棚の耐荷重はいくらですか。",
});
```

### `readGroundedAnswer(response)`

応答の `content` と `stop_reason` を受け取り、画面に出してよい結果だけを返します。

- `stop_reason` が `refusal` なら `{ status: "refused" }` です。`max_tokens` なら `{ status: "truncated" }` です。この 2 つは、本文に引用があっても本文を見ません。
- それ以外では、`type` が `"text"` で、`citations` の配列が 1 件以上あるブロックだけを残します。考える過程など、テキスト以外のブロックは飛ばします。
- 残ったブロックが 1 つもなければ `{ status: "not_found" }` です。決まった返事だけの応答も、引用の無い主張だけの応答も、同じです。
- 残ったブロックがあれば `{ status: "answered", text, sources }` です。`text` は残したブロックの `text` を順につないだものです。区切りは足しません。
- `sources` は、残したブロックの引用を出てきた順に `{ title, quote }` にしたものです。`title` は `document_title`、`quote` は `cited_text` です。`title` と `quote` の組が同じ引用は、最初の 1 件だけ残します。

引用の形の例です。位置のフィールドは読みません。

```js
{
  type: "char_location",
  cited_text: "棚の耐荷重は 80 kg です。",
  document_index: 0,
  document_title: "点検手引き",
  start_char_index: 0,
  end_char_index: 16,
}
```

## 確認と提出

VS Code の「STELLA: 課題を確認する」で、テスト・ESLint・Prettier を実行します。テストはリクエストと応答の形をした値を渡すので、API キーは要りません。テストと設定のファイルは書き換えません。

提出の説明欄に、必ず次の 2 点を書いてください。

- 指示だけで「出典を書いて」と頼む方法と、引用の機能を使う方法の違い
- 引用の無い文をそのまま表示しない理由

## 出典

課題とテストデータは教材用に作成しています。

- 文書ブロック、引用の応答、引用と構造化出力を同時に使えないこと。[Anthropic の引用（英語）](https://platform.claude.com/docs/en/build-with-claude/citations)
