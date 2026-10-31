---
sourceRefs: [SRC-claude-docs-tool-choice-20261031, SRC-claude-docs-tool-use-when-20261031, SRC-claude-docs-strict-tool-use-20261031, SRC-claude-docs-structured-considerations-20261031, SRC-anthropic-writing-tools-20261031]
---
# レッスン5-2 ツールを設計する

## このレッスンの目標

- [ ] ツールの説明に、使い方を決める情報を書けます。
- [ ] tool_choice と strict で、ツールの使われ方と入力の形を調整できます。
- [ ] 目的ごとに少数のツールへまとめる設計を選べます。

## 5-2-1 説明に書くこと

> **ツールの説明には、何をし、いつ使い、何を返すかを詳しく書きます。**

公式ドキュメントは、ツールの説明(`description`)を、ツールを使う性能に最も効くものとしています。1 つのツールに 3〜4 文以上を目安に、次のことを書きます。

- 何をするか、何を返すか
- いつ使い、いつ使わないか
- 入力の各項目の意味と、結果への効き方
- 返さない情報など、気をつけること

| 弱い説明 | 強い説明 |
| --- | --- |
| 在庫を取得する。 | 商品コード (sku) から、倉庫ごとの在庫数を返す。注文の前に、在庫があるかを確かめるときに使う。入荷の予定日は返さない。sku は「A-100」のような英字とハイフンと数字の形。 |

入れ子のある入力や形に決まりのある入力など、説明だけでは伝えにくいツールには、`input_examples` で入力の例を添えられます。説明が足りないと、入力が足りない呼び出しや、関係のない場面での呼び出しが増えます。入力の項目で Claude に理由を書かせたいときは、考えた過程ではなく、短い説明や根拠を求めます(考えた過程を求める項目は、拒否につながることがあります)。

## 5-2-2 ツールを使う場面を決める

> **ツールを使うかどうかは、tool_choice と system の指示で調整します。**

既定では、ツールを呼ぶか直接答えるかを、Claude が毎回決めます。頼まれたことがツールの説明に当てはまり、答えがまだ会話にないときにツールを呼びます。この判断は、system の指示で調整できます。

| ねらい | system の指示の例 |
| --- | --- |
| ツールを使う場面を増やす | 答える前に、ツールで調べてください |
| さらに強く | 答える前に、必ずツールを呼んでください |
| 控えめにする | ツールを呼ぶか直接答えるかは、判断して決めてください |

リクエストの `tool_choice` でも指定できます。

| 値 | 動き |
| --- | --- |
| `{ type: "auto" }`(既定) | 使うかどうかを Claude が決める |
| `{ type: "any" }` | どれかのツールを必ず使わせる |
| `{ type: "tool", name }` | 指定したツールを必ず使わせる |
| `{ type: "none" }` | ツールを使わせない |

ツールを必ず使わせる `any` と `tool` は、使えないモデルや設定があります。Claude Opus 5.5・Claude Sonnet 5.5・Claude Fable 5.1 では 400 エラーになるので、`auto` と system の指示で導き、入力の形は strict(5-2-3)で守らせます。決まった形の答えだけが要るなら、構造化出力を使います。

## 5-2-3 ツールの入力を守らせる

> **ツールの入力をスキーマどおりにさせるには、strict: true を指定します。**

`input_schema` を書いていても、それだけでは入力が必ずスキーマどおりになるとは限りません。数の項目に文字の `"2"` が入ったり、必須の項目が欠けたりすると、ツールの関数が例外で止まります。ツールの定義に `strict: true` を足すと、`tool_use` ブロックの `input` は必ず `input_schema` どおりになり、`name` も必ず定義したツールのどれかになります。

```js
{
  name: "book_room",
  description: "会議室を予約する。…",
  strict: true,
  input_schema: {
    type: "object",
    properties: { room: { type: "string" }, people: { type: "integer" } },
    required: ["room", "people"],
    additionalProperties: false,
  },
}
```

スキーマの決まりは構造化出力と同じです。オブジェクトには `additionalProperties: false` を書き、数の範囲や文字数の制限は書けません。1 つのリクエストで `strict: true` にできるツールは 20 個までです。

構造化出力と strict は、守らせるものが違います。構造化出力は Claude の答えの形を、strict はツールの入力の形を守らせます。両方を一緒に使うと、正しい入力でツールを呼び、最後に決まった形の JSON で答えるエージェントを作れます。

## 5-2-4 ツールは少数にまとめる

> **似たツールを並べず、目的ごとに少数のツールにまとめます。**

ツールは多ければよいわけではありません。API の機能を 1 つずつツールにすると、似たツールの間で取り違えが起き、ツールの説明だけでコンテキストを使います。人がどのツールを使うか決められないなら、Claude にも決められません。

| 分けすぎた形 | まとめた形 |
| --- | --- |
| `list_users`・`list_events`・`create_event` | 空いている時間を探して予定を入れる `schedule_event` |
| ログを全部返す `read_logs` | 関係する行とその前後だけを返す `search_logs` |
| `create_pr`・`review_pr`・`merge_pr` | `action` の項目で操作を選ぶ 1 つのツール |

ツールが増えるときは、名前の頭にサービス名や対象を付けます(`github_list_prs`・`slack_send_message`)。この付け方をツールの名前空間と呼び、ほかの人のツールと並んでも選び分けやすくなります。

ツールが返す値も、次の判断に要るものだけにします。意味の分からない内部の ID より、名前や意味の分かる ID を返すほうが、Claude は扱いやすくなります。

## もっと知りたい人へ

- [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) — 説明の書き方、ツールのまとめ方、tool_choice(英語)
- [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) — strict の仕組み(英語)
- [Writing effective tools for agents — with agents](https://www.anthropic.com/research/writing-tools-for-agents) — ツールの選び方・名前空間・返す値(英語)

知識問題で、このレッスンの内容を確かめます。
