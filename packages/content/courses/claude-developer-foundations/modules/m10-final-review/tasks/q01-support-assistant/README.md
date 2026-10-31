# 問い合わせに答えるアシスタント

通販サイトの問い合わせに答えるアシスタントを、最後まで動く形にします。Claude は注文を調べるツールを呼びながら答え、最後の答えを決まった形の JSON で返します。一時的なエラーの送り直しは SDK に任せ、アプリは応答の止まった理由とエラーを分けて扱います。

これは単元の確認A です。ヒントと解答例は、合格の判定が出るまで表示されません。取り組み中は、この課題文と、下の「参照してよい資料」の公式ドキュメント、JavaScript の文法の資料だけを使います。

`src/assistant.js` のいまの実装は、ツールも構造化出力も付けずに 1 回だけ送り、応答の最初のブロックを JSON として読んでいます。

## 作るもの

### `lookupOrderTool`

注文を調べるクライアントツールの定義です。

- 名前は `lookup_order` です。
- 説明(`description`)には、何をし、いつ使い、何を返すかを書きます。
- 入力は、文字列の `order_id` だけです。必須にし、ほかの項目を認めません。
- Claude の入力がこのスキーマどおりになるようにします。

### `replySchema`

最後の答えの JSON スキーマです。構造化出力で、Claude の答えをこの形にさせます。

| 項目 | 型 | 中身 |
| --- | --- | --- |
| `answer` | 文字列 | 問い合わせた人への答えの文 |
| `category` | `"shipping"`・`"refund"`・`"other"` のどれか | 問い合わせの種類 |
| `needs_human` | 真偽値 | 担当者が確かめる必要があるか |

3 つとも必須にし、ほかの項目を認めません。

### `answerInquiry(options)`

| 値 | 中身 |
| --- | --- |
| `client` | Claude のクライアント。`client.messages.create(本文, 設定)` で送る。テストでは偽のクライアントを渡す |
| `model`・`maxTokens` | リクエストの `model` と `max_tokens` |
| `question` | 問い合わせの文 |
| `handlers` | ツールの名前から、実行する関数(`async`)を引く表。関数は `tool_use` の `input` を受け取り、結果のオブジェクトを返す |
| `maxTurns` | `create` を呼ぶ回数の上限。省略すると 4 |
| `maxRetries` | SDK に任せる送り直しの回数 |

#### リクエスト

- 毎回のリクエストに、`model`・`max_tokens`・`system`(starter の `SYSTEM`)・`messages`・`tools`(`[lookupOrderTool]`)と、`replySchema` を使う構造化出力の指定を入れます。
- 最初の `messages` は、`question` を入れた user の発言 1 つです。
- `create` の第 2 引数に `{ maxRetries }` を渡し、一時的なエラーの送り直しを SDK に任せます。

#### 止まった理由ごとの扱い

応答の `stop_reason` で分けます。

| `stop_reason` | すること | 返す値 |
| --- | --- | --- |
| `tool_use` | ツールを実行し、結果を付けて次のリクエストを送る(下の「ツール」) | — |
| `end_turn` | テキストのブロックをつないだ JSON を読む | `{ status: "answered", reply: 読んだ答え, turns }` |
| `refusal` | 何も実行しない | `{ status: "refused", turns }` |
| `max_tokens`・`model_context_window_exceeded` | 答えを JSON として読まない | `{ status: "truncated", stopReason, turns }` |
| そのほか | 何も実行しない | `{ status: "unexpected", stopReason, turns }` |

- `turns` は、その応答までに `create` を呼んだ回数です。
- 応答の `content` には、`text` の前に `thinking` ブロックが入ることがあります。答えは `type` が `text` のブロックから読みます。
- `maxTurns` 回呼んでも `tool_use` が続いたら、それ以上送らずに `{ status: "max_turns", turns: maxTurns }` を返します。

#### ツール

- 応答の `content` は、`thinking` ブロックも含め、手を加えずに assistant の発言として `messages` に足します。
- 応答の中の `tool_use` のブロックを順に実行し、それぞれの結果を `tool_use_id` で呼び出しと結んだ `tool_result` にして、1 つの user の発言にまとめて足します。
- 結果の `content` は、関数が返したオブジェクトを `JSON.stringify` した文字列です。
- `handlers` にないツールと、例外を投げたツールは、`is_error: true` を付けた `tool_result` にします。`content` には、知らないツールならその名前を、例外なら例外の内容を入れます。処理は止めずに、次のリクエストを送ります。

#### エラー

`create` が投げたエラーは、SDK が送り直したあとのものです(テストの偽のクライアントも、そのように振る舞います)。

- `status` が 429 か 500 以上なら、アプリでは重ねて送り直さずに `{ status: "unavailable", httpStatus: status }` を返します。
- それ以外のエラー(400 などや、`status` を持たないもの)は、そのまま投げます。

```js
const result = await answerInquiry({
  client,
  model,
  maxTokens: 1024,
  question: "注文 A-1024 はいつ届きますか？",
  handlers: { lookup_order: findOrder },
  maxRetries: 3,
});
// => { status: "answered", reply: { answer: "…", category: "shipping", needs_human: false }, turns: 2 }
```

## 説明欄に書くこと

提出の説明欄に、次の 3 つを、自分のコードの箇所に即して書きます。

1. 構造化出力と `strict` を、それぞれ何の形を決めるために使ったか。
2. `stop_reason` の分岐と、エラーの扱いを分けた理由。`max_tokens` で切れた応答を JSON として読まない理由。
3. 429・529 をアプリで重ねて送り直さない理由。

## 参照してよい資料

- [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) — tool_result の返し方、is_error(英語)
- [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) — ツールの入力をスキーマどおりにさせる(英語)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — 構造化出力と strict を一緒に使う方法(英語)
- [Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) — stop_reason の値とエラーとの違い(英語)
- [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) — ツール使用で thinking ブロックを返すこと(英語)
- [TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript) — 送り直しの設定(英語)
- [Claude API errors](https://platform.claude.com/docs/en/api/errors) — HTTP のエラーと SDK のエラー(英語)

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません(テストは偽のクライアントを渡します)。テストと設定のファイルは書き換えません。

本物の `Anthropic` のクライアントと、注文を返す偽の `lookup_order` の関数を渡して動かしてみるのは任意です(費用がかかります)。
