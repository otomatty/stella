---
sourceRefs: [SRC-claude-docs-batch-20261031, SRC-claude-docs-batch-usage-20261031]
---
# レッスン2-3 バッチ処理

## このレッスンの目標

- [ ] Message Batches API に向く処理を選べます。
- [ ] custom_id の付いたリクエストの束を組み立てられます。
- [ ] バッチの結果を、custom_id で元のリクエストと結べます。

## 2-3-1 急がない大量の処理

> **急がない大量の処理は、Message Batches API にまとめて送ります。**

バッチは、まとめて送って非同期に処理させるリクエストの束です。Message Batches API に送ると、束の中のリクエストはそれぞれ別に処理され、終わったら結果をまとめて受け取れます。大量の評価や分類、まとめての要約のように、すぐに結果が要らない処理に向きます。画面ですぐに答えを返す処理には向きません。

束の 1 件ずつは、`custom_id` と `params` を持ちます。`custom_id` は結果と元のリクエストを結ぶための ID で、束の中で重ならない 1〜64 文字の英数字・ハイフン・アンダースコアにします。`params` には、Messages API と同じ項目を書きます。

```js
const requests = tickets.map((ticket) => ({
  custom_id: `ticket-${ticket.id}`,
  params: { model, max_tokens: 256, messages: [{ role: "user", content: ticket.body }] },
}));
```

1 つのバッチに入れられるのは、10 万件か 256 MB の、先に届いたほうまでです。

## 2-3-2 バッチの料金

> **Message Batches API の料金は、通常の半額です。**

Message Batches API では、入力と出力のトークンが、どちらも通常の料金の 50% で課金されます。結果をすぐに使う処理は通常の Messages API、待てて量の多い処理は Message Batches API と、費用と待ち時間を比べて選びます。

## 2-3-3 バッチの結果を受け取る

> **バッチの結果は、すべて終わるか 24 時間たつと受け取れます。**

バッチはできるだけ早く処理され、多くは 1 時間以内に終わります。結果を受け取れるのは、すべてのリクエストが終わったときか、24 時間たったときの早いほうです。24 時間で処理が終わらなかったリクエストは期限切れになります。結果は作ってから 29 日間取り出せます。

結果は送った順に並ぶとは限らないので、`custom_id` で元のリクエストと結びます。

```js
for (const item of results) {
  byId.set(item.custom_id, item.result);
}
```

結果の種類(`result.type`)は 4 つです。

| 種類 | 意味 | 課金 |
| --- | --- | --- |
| `succeeded` | 成功し、応答(message)がある | される |
| `errored` | 形の誤りや内部のエラーで、応答が作られなかった | されない |
| `canceled` | 処理される前にバッチが取り消された | されない |
| `expired` | 処理される前に 24 時間の期限が来た | されない |

## もっと知りたい人へ

- [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) — 仕組み・料金・束の作り方・結果の受け取り方(英語)

知識問題で、このレッスンの内容を確かめます。単元の課題「バッチのリクエストを組み立てる」は、課題一覧の「VS Code で開く」から取り組みます。
