---
sourceRefs: [SRC-claude-docs-token-counting-20261031, SRC-claude-docs-thinking-20261031, SRC-claude-docs-effort-set-20261031, SRC-claude-docs-effort-20261031, SRC-claude-docs-latency-20261031]
---
# レッスン3-3 トークンの量と応答の速さ

## このレッスンの目標

- [ ] 送る前に、入力のトークン数を数えられます。
- [ ] 考える過程と effort・max_tokens の関係を説明できます。
- [ ] 応答を速くするために見直すところを選べます。

## 3-3-1 送る前に量を数える

> **入力のトークン数は、送る前にトークン数を数える API で確かめます。**

トークン数を数える API は、`messages.create` と同じ形の入力(system・ツールの定義・画像・PDF を含む)を受け取り、入力のトークン数を返します。応答は作りません。

```js
const { input_tokens } = await client.messages.countTokens({
  model,
  system,
  messages,
});
```

この API は無料で使えます。1 分あたりのリクエスト数の制限はありますが、Messages API の制限とは別に数えます。数えた値は、費用の見積もり、レート制限の管理、入力の長さに応じたモデルの振り分けに使えます。

気をつけることが 3 つあります。

- 返る値は見積もりで、実際に使われるトークン数と少しずれることがあります。
- 同じ文章でも、モデルによってトークン数が変わります。Claude 4.7 以降のモデルは新しい数え方を使い、前のモデルより 3 割ほど多くなることがあります。前のモデルで数えた値を使い回さず、使うモデルで数え直します。
- サーバー側で動くツール(ウェブ検索など)や、`url`・`file` で渡す画像・PDF は数えられません。画像と PDF は base64 にして渡すと数えられます。

## 3-3-2 考える過程も出力に数える

> **考える過程のトークンも出力に数えるので、出力の上限は max_tokens で決めます。**

最近のモデル(Claude 5 以降)は、答える前に考える過程を既定で使います。考えるかどうかと、どれだけ深く考えるかは、リクエストの難しさに応じてモデルが決めます(適応型の思考)。応答の content には、`thinking` ブロックが `text` ブロックより前に並びます。

```js
const thinking = message.content.filter((block) => block.type === "thinking");
const answer = message.content.filter((block) => block.type === "text");
```

多くのモデルでは、`thinking` ブロックの中身は既定で空です(表示しない設定)。中身を表示してもしなくても、考えた分のトークンは同じように出力として課金されます。考える過程は使えるトークンの上限である `max_tokens` にも数えるので、考える量が増えると答えに回る分が減り、答えが途中で切れる(stop_reason が `max_tokens`)ことがあります。

考える量と費用の調整には、次の 2 つを使い分けます。

| 目的 | 使うもの |
| --- | --- |
| 費用や遅延を下げたい | effort を下げる。考える過程を含む応答全体が小さくなる |
| 考える回数や深さが足りない | effort を上げる |
| 費用の上限を確実に決めたい | `max_tokens`。effort は目安で、`max_tokens` は厳密な上限 |

effort を high 以上にするときは、`max_tokens` を大きくして、考える過程と答えの両方が入る余地を残します。考える過程を止められるかはモデルによって違い、Claude Opus 5.5 は止められません。止められないモデルでは、effort が考える量を決める主な手段です。

## 3-3-3 応答を速くする

> **応答を速くするには、モデル・トークンの量・ストリーミングの 3 つを見直します。**

遅延は、プロンプトを送ってから出力が返るまでの時間です。測るときは、全体の時間のほかに、最初のトークンが届くまでの時間(TTFT)を見ます。ストリーミングで表示する画面では、最初のトークンまでの時間が使いやすさを左右します。

| 見直すところ | すること |
| --- | --- |
| モデル | 速さが大事な処理には、最も速い Claude Haiku 5.5 を選び、effort を下げる |
| トークンの量 | プロンプトを簡潔にし、短い答えを頼む。`max_tokens` で出力の長さに上限を付ける |
| ストリーミング | 出力が終わる前から、届いた順に表示する |

短い答えを頼むときは、語の数より、段落や文の数で指示するほうが効きます。`max_tokens` は、届いたところで文の途中でも出力を切ります。答えが最初に来る選択式や短い答えに向く、粗い方法です。

ストリーミングは、出力が終わるまでの時間は縮めません。最初のトークンから表示できるので、利用者が待つ感じを小さくします。

## もっと知りたい人へ

- [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting) — トークン数を数える API の使い方・料金・制限(英語)
- [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) — 考える過程の仕組み・設定・effort との関係(英語)
- [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) — effort の書き方と考える過程への効き方(英語)
- [Reducing latency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency) — 遅延の測り方と縮め方(英語)

知識問題で、このレッスンの内容を確かめます。
