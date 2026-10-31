---
sourceRefs: [SRC-claude-docs-tool-use-20261031, SRC-claude-docs-define-tools-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-errors-20261031]
---
# レッスン5-1 ツールを使わせる仕組み

## このレッスンの目標

- [ ] ツールを定義し、呼び出しを受けて実行し、結果を返すループを説明できます。
- [ ] ツールの失敗を、is_error を付けた結果として返せます。
- [ ] クライアントツールとサーバーツールの違いを説明できます。

## 5-1-1 ツールを実行するのはアプリ

> **自分で定義したツールは、Claude が呼び出しを求め、アプリが実行します。**

ツールは、アプリが Claude に使わせる関数です。Claude は自社のデータを知らず、外のシステムも操作できませんが、ツールを渡すと「このツールをこの入力で呼んでほしい」と求められるようになります。実行するのは Claude ではなく、アプリです。

ツールはリクエストの `tools` に定義します。

| 項目 | 中身 |
| --- | --- |
| `name` | ツールの名前(英数字・`_`・`-` で 1〜128 文字) |
| `description` | 何をし、いつ使い、どう動くかの説明 |
| `input_schema` | ツールに渡す入力の JSON スキーマ |

```js
const message = await client.messages.create({
  model,
  max_tokens: 1024,
  tools: [
    {
      name: "get_stock",
      description: "商品コード (sku) から、倉庫の在庫数を調べる。",
      input_schema: {
        type: "object",
        properties: { sku: { type: "string", description: "商品コード" } },
        required: ["sku"],
      },
    },
  ],
  messages: [{ role: "user", content: "A-100 の在庫はありますか？" }],
});
```

Claude がツールを使うと決めると、応答の `stop_reason` は `"tool_use"` になり、`content` に `tool_use` ブロックが入ります。`tool_use` ブロックは、呼び出しの `id`、ツールの `name`、入力の `input` を持ちます。アプリは `name` に合う関数を、`input` を渡して実行します。

## 5-1-2 結果を返す

> **ツールの結果は tool_result にして、次のリクエストの user の発言で返します。**

実行した結果は、次のリクエストで返します。会話の履歴に、応答の `content` をそのまま assistant の発言として足し、続けて `tool_result` ブロックを持つ user の発言を足します。

```js
messages.push({ role: "assistant", content: message.content });
messages.push({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: block.id, content: "12" }],
});
```

| 項目 | 中身 |
| --- | --- |
| `tool_use_id` | 結果を返す `tool_use` ブロックの `id` |
| `content` | ツールの結果(文字列か、テキスト・画像・文書のブロックの配列) |
| `is_error` | 失敗したときに `true`(5-1-3) |

返し方には決まりがあります。

- `tool_result` の発言は、`tool_use` を含む発言のすぐあとに置きます。間にほかの発言を入れられません。
- user の発言の `content` では、`tool_result` のブロックを先頭に並べます。文を添えるなら、すべての結果のあとに置きます。
- 1 つの応答に `tool_use` ブロックが複数あれば、すべての結果を 1 つの user の発言にまとめて返します。

`stop_reason` が `"tool_use"` の間は、実行して結果を返すことを繰り返します。`"end_turn"` になったら、それが答えです。この繰り返しを、ツール使用のループと呼びます。SDK には、ツールを実行して結果を返すところまで代わりに行う、ツールランナー(tool runner)もあります。

ツールの結果には、ウェブページやメールのように、外から来た信頼できない文章が入ることがあります。そうした文章は `system` や user の文に混ぜず、`tool_result` の中に入れて渡します(安全性の単元で扱います)。

## 5-1-3 失敗を返す

> **ツールが失敗したら、is_error を付けた結果で、何が起きたかを返します。**

ツールの実行で例外が起きたときに、そのまま投げるとループ全体が止まり、利用者には何も返りません。失敗は、`is_error: true` を付けた `tool_result` として Claude に返します。Claude は失敗を受け取り、利用者への説明や別のやり方を考えます。

```js
{
  type: "tool_result",
  tool_use_id: block.id,
  is_error: true,
  content: "在庫の API に接続できません。少し待ってから試してください。",
}
```

結果の文は、「失敗」とだけ書かず、何が起き、次に何をすればよいかを書きます(例: 「回数の上限に達しました。60 秒後に試してください」)。

入力が足りないなど、呼び出しそのものが正しくないときも、失敗として返せます。Claude は足りない情報を補って、2〜3 回呼び直します。そもそも正しくない呼び出しをなくしたいときは、入力をスキーマどおりにさせる指定(strict)を使います(5-2-3)。

## 5-1-4 Anthropic 側で動くツール

> **サーバーツールは Anthropic の側で実行され、アプリが結果を返す処理は要りません。**

ツールは、どこで実行されるかで 2 つに分かれます。

| 種類 | 実行する場所 | 例 | アプリがすること |
| --- | --- | --- | --- |
| クライアントツール | アプリ | 自分で定義したツール。形を Anthropic が決めた bash・テキストエディター・メモリー・コンピューター操作 | 実行して `tool_result` を返す |
| サーバーツール | Anthropic | ウェブ検索・ウェブの取得・コードの実行・ツールの検索 | 何もしない(結果は応答に入って返る) |

bash やテキストエディターは、ツールの形を Anthropic が決めていて Claude もその形に慣れていますが、実行するのはアプリです。サーバーツールのエラーは Claude が扱うので、アプリが `is_error` の結果を返す必要はありません。

1 つの応答に、クライアントツールの呼び出しと、まだ結果のないサーバーツールの呼び出しが並ぶことがあります。そのときは、クライアントツールの `tool_result` だけを返し、`tools` を変えずに次のリクエストを送ります。

## もっと知りたい人へ

- [Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) — ツール使用の仕組みと、ツールの種類(英語)
- [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) — ツールの定義の書き方(英語)
- [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) — 結果とエラーの返し方(英語)

知識問題で、このレッスンの内容を確かめます。単元の課題「ツール使用のループを回す」と「ツールの失敗で止まるのを直す」は、課題一覧の「VS Code で開く」から取り組みます。
