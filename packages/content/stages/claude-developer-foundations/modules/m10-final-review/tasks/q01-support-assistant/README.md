# 問い合わせに答えるアシスタント

「A-1024 と B-2048 は発送済みですか」と問い合わせが届きました。先に調べた注文は発送済みです。もう一方の照会だけが失敗しました。2 件の結果を区別して Claude に返し、2 件目の再照会から回答までを手元で再現してください。

注文システムは倉庫のメモや社内の連絡先も返します。窓口に必要なのは注文番号・状態・発送日・返金の受付期限です。窓口から呼べるのは照会だけで、担当者用の取り消し処理も同じアプリに登録されています。

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
| `handlers` | アプリに登録した関数の表。窓口が実行できるのは、ここに登録した `lookup_order` だけ。照会対象の注文へのアクセス権はこの関数が確認済みとする |
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
- 最後に許された回で `tool_use` が届いたら、そこで `{ status: "max_turns", turns: maxTurns }` を返します。結果を Claude に返せる回が残っているときだけ、注文を照会します。

#### ツール

- 応答の `content` は、`thinking` ブロックも含め、手を加えずに assistant の発言として `messages` に足します。
- 応答の中の `tool_use` のブロックを順に実行し、それぞれの結果を `tool_use_id` で呼び出しと結んだ `tool_result` にして、1 つの user の発言にまとめて足します。
- 成功したら `order_id`・`status`・`shipped_on`・`refund_deadline` の 4 項目を JSON 文字列にして返します。注文システムが付け足した項目は送信しません。
- 許可していない名前や照会関数の未登録は、関数を呼ばずに、指定された名前を含む `is_error: true` の結果を返します。
- 照会関数が例外を投げたら、`is_error: true` を付け、本文を「注文を照会できませんでした。」とします。例外には社内の接続先が入ることがあります。
- 同じ応答で 1 件の照会だけが失敗しても、成功した分と失敗した分の両方を返します。再照会は、次の応答で Claude が新しい ID の `tool_use` を返したときに行います。

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

提出の説明欄に、次の 3 点を書きます。テスト「受付記録をたどる」の 3 回目のリクエストは `client.calls[2]` で読めます。

1. この記録の `t1`・`t2`・`t3` に、それぞれどの注文のどんな結果が対応したか。最初の照会で余分だった項目を 1 つ挙げ、送信直前のどこで外したか。
2. 入力の `strict` と回答の構造化出力がそれぞれ何を保証するか。同じアプリの取り消し処理を呼べないことを、どのテストで確かめたか。
3. 照会関数の例外、途中で切れた応答、SDK が投げた 529 について、それぞれ誰に何を返したか。529 が出たあと `create` の回数が増えない理由は何か。

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

失敗したら、テスト名と観測値を控えます。たとえば「3 回目の履歴の発言数は期待 5、実際 3」なら、2 回目までに組み立てた履歴が残っているかを確認します。修正後は「課題を確認する」で全件を再実行してください。テスト全件と説明欄の 3 点が、この課題を提出する目安です。
