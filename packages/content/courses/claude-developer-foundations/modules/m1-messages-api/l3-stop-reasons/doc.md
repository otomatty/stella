---
sourceRefs: [SRC-claude-docs-stop-reasons-20261031, SRC-claude-docs-refusals-20261031]
---
# レッスン1-3 止まった理由で扱いを分ける

## このレッスンの目標

- [ ] stop_reason の主な値と意味を言えます。
- [ ] 途中で切れた応答を見分けて扱えます。
- [ ] 拒否された応答を、エラーと分けて扱えます。

## 1-3-1 止まった理由で分ける

> **応答の処理は、stop_reason の値ごとに分けます。**

stop_reason は、応答が止まった理由を表す項目です。受け取った応答をいつも完成した答えとして扱うと、途中で切れた応答や断られた応答も同じに見えてしまいます。応答の処理は、stop_reason の値で分けます。

```js
switch (response.stop_reason) {
  case "end_turn": return showAnswer(response);
  case "max_tokens": return showTruncated(response);
  default: return showError(response);
}
```

主な値は次のとおりです。end_turn は、Claude が答えを自然に終えたことを表します。

| 値 | 起きること | すること |
| --- | --- | --- |
| end_turn | 答えを終えた | 応答を使う |
| max_tokens | 出力の上限に届いた | 上限を上げるか、続きを書かせる |
| stop_sequence | 指定した区切りの文字列が出た | どの区切りで止まったかを読む |
| tool_use | ツールを呼びたい | ツールを実行して結果を返す |
| pause_turn | サーバー側のツールの繰り返しが上限に届いた | 応答をそのまま返して続けさせる |
| refusal | 答えるのを断った | 拒否として扱う |
| model_context_window_exceeded | コンテキストウィンドウがいっぱいになった | 途中で切れたものとして扱う |

ツールに関わる値は、ツール使用の単元で詳しく扱います。知らない値が来たときに、ほかの値の扱いへ混ぜないことも大切です。

## 1-3-2 上限で切れた応答

> **stop_reason が max_tokens の応答は、途中で切れています。**

max_tokens で止まった応答は、文の途中や JSON の途中で切れています。完成した答えとして使うと、表示が途切れたり、JSON として読めずにエラーになったりします。

```js
if (response.stop_reason === "max_tokens") {
  return { truncated: true, text: textOf(response) };
}
```

切れたときは、max_tokens を上げて送り直すか、受け取った分に続けて書かせます。コンテキストウィンドウがいっぱいで止まった応答(model_context_window_exceeded)も、途中で切れたものとして扱います。

## 1-3-3 拒否された応答

> **stop_reason が refusal の応答は、エラーではなく拒否として扱います。**

Claude が答えるのを断ると、stop_reason が refusal の応答が返ります。拒否は HTTP のエラーではなく、HTTP 200 の普通の応答として返るので、例外の処理だけでは気づけません。

```json
{ "content": [], "stop_reason": "refusal",
  "stop_details": { "type": "refusal", "category": "cyber", "explanation": "…" } }
```

stop_details は拒否の理由を表します。category は理由の分類、explanation は人が読む説明です。explanation の文は変わることがあるので、表示に使い、中身で分岐しません。どちらも null のことがあります。拒否されたことは利用者に伝え、必要なら別のモデルで送り直します。

## もっと知りたい人へ

- [Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) — stop_reason の値と、値ごとの扱い方(英語)
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) — 拒否の応答の形と、別のモデルでの送り直し(英語)

知識問題で、このレッスンの内容を確かめます。単元の課題「止まった理由で処理を分ける」は、課題一覧の「VS Code で開く」から取り組みます。
