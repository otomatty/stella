---
sourceRefs: [SRC-claude-docs-messages-20261031, SRC-claude-docs-messages-system-20261031, SRC-claude-api-messages-create-20261031, SRC-claude-docs-stop-reasons-20261031]
---
# レッスン1-1 リクエストと応答の形

## このレッスンの目標

- [ ] 会話の履歴と新しい発言から、messages の配列を組み立てられます。
- [ ] system と max_tokens の役割を説明できます。
- [ ] 応答の content からテキストを取り出せます。

## 1-1-1 会話は毎回まとめて送る

> **Messages API は会話を覚えないので、それまでのやり取りを messages の配列で毎回送ります。**

リクエストはアプリが API に送る依頼、応答は API から返る結果です。Messages API は状態を持たない(ステートレスな)API で、前のリクエストの中身を覚えていません。続けてやり取りするときは、それまでの会話の履歴を messages の配列にまとめて、毎回すべて送ります。

配列の要素は、発言した側を表す role と、発言の中身の content を持ちます。role は利用者の user と Claude の assistant で、交互に並べ、最後に新しい発言を置きます。

```js
const messages = [
  { role: "user", content: "注文の状況を教えて" },
  { role: "assistant", content: "注文番号を教えてください" },
  { role: "user", content: "A-1024 です" },
];
```

会話の履歴を持つのは、呼び出す側のアプリです。受け取った応答を assistant の発言として履歴に足し、次の発言を user として足してから送ります。

## 1-1-2 前提は system に書く

> **最初から効かせる役割や前提は、messages ではなく system に書きます。**

system は、目的や役割などの前提を Claude に渡すための項目です。リクエストの一番上の階層に置き、利用者とのやり取りを並べる messages とは分けます。役割の指示を毎回の発言につなぐと、どこまでが指示かが分かりにくくなり、履歴を組み立てる処理も複雑になります。

```js
const request = {
  system: "あなたは社内ヘルプデスクの担当者です",
  messages: [{ role: "user", content: "VPN につながりません" }],
};
```

一部の新しいモデルでは、会話の途中に system の発言を足す方法もあります。それでも、最初から効かせる指示は一番上の階層の system に書くよう、公式ドキュメントは案内しています。

## 1-1-3 出力の上限を決める

> **max_tokens は出力の上限で、届くと応答はそこで止まります。**

トークンは、モデルが文章を数える単位です。max_tokens はリクエストに必ず書く項目で、Claude が出力するトークン数の上限を決めます。上限に届くと、応答は文の途中でも止まります。

```js
const request = {
  max_tokens: 1024,
  messages: [{ role: "user", content: "議事録を要約して" }],
};
```

上限は「この長さで書く」という目安ではありません。上限より早く答えを終えることはありますが、上限を超えて書き続けることはありません。使える上限の値はモデルごとに違います。

## 1-1-4 応答はブロックの配列

> **応答の content は、type で形の決まるブロックの配列です。**

応答の content は文字ではなく、コンテンツブロックの配列です。ブロックは type を持ち、type ごとに形が決まります。テキストのブロックは `{ type: "text", text: "…" }` の形です。

```js
const text = response.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("");
```

テキストのブロックが 2 つ以上来ることも、テキスト以外のブロックが先に来ることもあります。`content[0].text` だけを読むと本文を取りこぼすので、type で選んでからつなぎます。

## もっと知りたい人へ

- [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) — リクエストと応答の基本、続けてやり取りするときの送り方(英語)
- [Messages (API リファレンス)](https://platform.claude.com/docs/en/api/messages) — system・max_tokens・content の定義(英語)

知識問題で、このレッスンの内容を確かめます。単元の課題「会話の履歴を組み立てる」は、課題一覧の「VS Code で開く」から取り組みます。
