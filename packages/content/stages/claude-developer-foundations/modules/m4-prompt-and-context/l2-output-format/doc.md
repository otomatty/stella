---
sourceRefs: [SRC-claude-docs-structured-outputs-20261031, SRC-claude-docs-structured-considerations-20261031, SRC-claude-docs-prompting-20261031, SRC-claude-developer-guide-v11-20261118]
---
# レッスン4-2 出力の形を決める

## このレッスンの目標

- [ ] 構造化出力に渡す JSON スキーマを書けます。
- [ ] 構造化出力の応答を、止まった理由を確かめてから読めます。
- [ ] 文章の書き方を、してほしい形で指示できます。

## 4-2-1 決まった形の JSON

> **決まった形の JSON が要るときは、構造化出力でスキーマを渡します。**

「JSON で答えて」と頼むだけでは、JSON として読めない文字や、欠けた項目・違う型が混ざることがあります。構造化出力は、JSON スキーマ(項目・型・必須の項目を決める書き方)をリクエストに渡し、応答をそのスキーマどおりの JSON に絞る機能です。スキーマはリクエストの `output_config.format` に書き、JSON は応答の `text` ブロックに入って返ります。

```js
const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    plan: { type: "string", enum: ["basic", "pro", "enterprise", "unknown"] },
  },
  required: ["name", "plan"],
  additionalProperties: false,
};
const message = await client.messages.create({
  model,
  max_tokens: 1024,
  messages,
  output_config: { format: { type: "json_schema", schema } },
});
```

スキーマには、JSON Schema のうち使えるものが決まっています。

| 使える | 使えない(400 エラー) |
| --- | --- |
| 基本の型(object・array・string・integer・number・boolean・null)、`enum`、`required`、`anyOf`、決まった文字列の形(`date`・`email` など) | 数の範囲(`minimum`・`maximum` など)、文字数(`minLength`・`maxLength`)、再帰するスキーマ |

オブジェクトには `additionalProperties: false` を書きます。使えない制限は、受け取ったあとにアプリで確かめます。SDK の補助の中には、使えない制限をスキーマから外して項目の説明に書き足し、受け取った値を元のスキーマで確かめるものがあります。

分からないときの値も、スキーマで決めておきます。書かれていなければ `null` にする項目は `type: ["string", "null"]`、選択肢から選ぶ項目は `enum` に `"unknown"` を入れる、のように書きます。必須でない項目は、出力では必須の項目のあとに並びます。並び順が大事なら、すべての項目を必須にします。

以前は、応答の書き出しを assistant の発言として先に入れる方法(prefill)で形を決めることがありました。Claude 4.6 以降のモデルでは、最後の assistant の発言を先に入れたリクエストは 400 エラーになります。形を決めたいときは、構造化出力を使います。

## 4-2-2 止まった理由を先に見る

> **構造化出力の応答は、stop_reason を確かめてから JSON として読みます。**

構造化出力でも、次の応答はスキーマどおりとは限りません。

| stop_reason | 起きたこと | 扱い |
| --- | --- | --- |
| `refusal` | 安全のために拒否した。HTTP は 200 で、作ったトークンは課金される | 拒否として扱う(M1 の 1-3-3) |
| `max_tokens` | 上限に届いて、JSON の途中で切れた | `max_tokens` を上げて送り直す |

そのため、応答を JSON として読む前に `stop_reason` を確かめます。

```js
function readJson(message) {
  if (message.stop_reason !== "end_turn") {
    return { ok: false, reason: message.stop_reason };
  }
  const text = message.content.find((block) => block.type === "text").text;
  return { ok: true, data: JSON.parse(text) };
}
```

`enum` の文字列は、大文字と小文字の違いまでは保証されません(空白のあとの語の先頭が変わることがあります)。大文字と小文字を区別しない値を選ぶか、読むときにそろえます。

### 演習　購買担当の承認欄に何を残すか

社内の購入申請を読み、`approved`（承認済みか）と `approver`（承認者名か `null`）を台帳に入れます。この台帳は承認済みの申請に承認者名を必須とします。各行を「登録」「再取得」「人が原文を確認」に分け、判断に使った欄を一つ示してください。

| 申請 | 停止理由 | 応答の本文 |
| --- | --- | --- |
| 31 | `end_turn` | `{"approved":false,"approver":null}` |
| 32 | `max_tokens` | `{"approved":true,"approver":"佐` |
| 33 | `end_turn` | `{"approved":true,"approver":null}` |

31 は登録できます。32 は上限に達したのでその回の出力を捨て、出力の枠を増やして再取得します。33 は JSON として読め、項目の型も合います。ただし承認者を特定できません。承認を取り消したり名前を補ったりせず、人が原文を確かめます。構造化出力を使っても、項目どうしが業務の条件を満たすかはアプリで判定します。

条件を一つ変えてみましょう。承認印の無い仮申請も保存できる台帳で、33 を通常の承認済み申請と混同しないためには、どんな状態を設けますか。「承認者確認待ち」として仮保存し、確定した申請だけを発注に回せれば条件を満たします。

## 4-2-3 してほしい形で頼む

> **出力の書き方は、禁止ではなく、してほしい形で指示します。**

JSON ではない文章の書き方は、指示で整えます。公式ドキュメントは、次の方法を挙げています。

1. **禁止ではなく、してほしいことを書く**: 「マークダウンを使わないで」より「段落がなめらかにつながる文章で書いて」
2. **タグで包むように頼む**: 「本文は `<answer>` のタグの中に書いて」
3. **プロンプトの書き方を、ほしい出力に似せる**: プロンプトからマークダウンを減らすと、出力のマークダウンも減りやすい
4. **こだわりがあるなら、詳しく指示する**: どんなときに見出しや箇条書きを使ってよいかを書く

前置き(「以下が要約です」など)を省かせたいときも、「前置きなしで、すぐに本題から答えて」と、してほしい形で書きます。それでも混ざるときは、アプリで取り除きます。

## もっと知りたい人へ

- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — 仕組み、スキーマの書き方と使えない制限、スキーマどおりにならない場合(英語)
- [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — 出力の書き方の指示と、prefill からの移り方(英語)

知識問題で、このレッスンの内容を確かめます。単元の課題「抽出のスキーマを書く」は、課題一覧の「VS Code で開く」から取り組みます。
