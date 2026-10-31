---
sourceRefs: [SRC-claude-docs-streaming-20261031, SRC-claude-docs-errors-long-requests-20261031, SRC-claude-docs-streaming-deltas-20261031]
---
# レッスン2-2 ストリーミング

## このレッスンの目標

- [ ] ストリーミングを使う場面を説明できます。
- [ ] イベントの列から本文と止まった理由を読み取れます。
- [ ] 途中の表示が要らないときに、まとめた応答を受け取れます。

## 2-2-1 届いた順に表示する

> **長い応答は、ストリーミングで届いた順に表示します。**

ストリーミングは、応答を少しずつ受け取る方法です。応答が全部できるまで待つと、長い回答では画面に何も出ない時間が続きます。ストリーミングなら、届いた文字から順に表示できます。

```js
client.messages
  .stream(request)
  .on("text", (text) => appendToScreen(text));
```

画面に出す必要がなくても、max_tokens の大きいリクエストはストリーミングかバッチで送ります。長く待つ通信は、途中のネットワークで切られることがあるためです。公式ドキュメントは、特に 10 分を超えそうなリクエストでこの 2 つを使うよう案内しています。

## 2-2-2 差分のイベント

> **ストリーミングでは、本文が差分のイベントとして順に届きます。**

ストリーミングで届くのは、普通の応答の形ではなく、type で種類の分かるイベントの列です。

1. `message_start` — content が空の応答で始まる
2. ブロックごとに `content_block_start` → `content_block_delta`(1 回以上)→ `content_block_stop`。各イベントの `index` が、最後の応答の content の何番目かを表す
3. `message_delta` — `delta.stop_reason` に止まった理由が入る
4. `message_stop` — 終わり

本文の続きは、`content_block_delta` の `delta` が `text_delta` のときの `text` です。ツールの入力は `input_json_delta` で、JSON の断片として届きます。

```js
if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
  text += event.delta.text;
}
```

途中に `ping` が何度でも混ざることがあり、新しい種類のイベントが足されることもあります。知らないイベントは読み飛ばします。混雑のエラーが、HTTP 200 のあとにイベントとして届くこともあります。

## 2-2-3 まとめた応答を受け取る

> **イベントを1つずつ扱わなくても、SDK で最後にまとめた応答を受け取れます。**

ファイルに保存するだけのように、途中を表示しないなら、イベントを組み立てる処理は要りません。SDK の `finalMessage()` を待つと、中ではストリーミングで受け取りながら、`messages.create` の応答と同じ形にまとめて返します。

```js
const stream = client.messages.stream(request);
const message = await stream.finalMessage();
```

max_tokens の大きいリクエストでは、SDK が通信の時間切れを避けるためにストリーミングを求めることがあり、そのときにもこの書き方が使えます。

## もっと知りたい人へ

- [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) — SDK での受け取り方、イベントの種類と流れ(英語)
- [Claude API errors の Long requests](https://platform.claude.com/docs/en/api/errors) — 長いリクエストでストリーミングかバッチを使う理由(英語)

知識問題で、このレッスンの内容を確かめます。単元の課題「ストリームから本文を組み立てる」は、課題一覧の「VS Code で開く」から取り組みます。
