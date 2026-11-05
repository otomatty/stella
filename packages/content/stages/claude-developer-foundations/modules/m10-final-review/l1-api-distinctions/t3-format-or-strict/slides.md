---
sourceRefs: [SRC-claude-docs-structured-combined-20261031, SRC-claude-docs-strict-tool-use-20261031]
id: 10-1-3
title: スキーマをかける場所
takeaway: "応答の形は構造化出力で、ツールの入力の形は strict で決め、両方を同じリクエストで使えます。"
introduces: []
requires: [構造化出力, output_config, strict, tool_use, JSON スキーマ]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# スキーマをかける場所
<!-- ノート: JSON スキーマで形を決める 2 つの機能を、決める相手で分けます。 -->
---
# 直らない
ツールの入力の JSON が、ときどきスキーマに合いません。output_config.format を足しましたが、直りませんでした。
<!-- ノート: output_config.format が決めるのは、Claude が答える本文です。 -->
---
# 決める相手が違う
応答の形は構造化出力で、ツールの入力の形は strict で決め、両方を同じリクエストで使えます。
<!-- ノート: 構造化出力は Claude が何を言うか、strict はツールをどう呼ぶかを決めます。 -->
---
# 書く場所
| 決めるもの | 書く場所 |
| --- | --- |
| 答えの本文(text ブロック) | output_config.format |
| ツールの入力(tool_use の input) | ツールの定義の strict: true |
<!-- ノート: ツールの入力のスキーマは、ツールの input_schema に書きます。 -->
---
# 両方を使う
```js
const request = {
  model,
  max_tokens: 1024,
  messages,
  tools: [{ name: "lookup_order", strict: true, input_schema: orderInput }],
  output_config: { format: { type: "json_schema", schema: replySchema } },
};
```
<!-- ノート: ツールの呼び出しも、最後の答えも、スキーマどおりになります。 -->
---
<!-- _class: summary -->
# まとめ
応答の形は構造化出力で、ツールの入力の形は strict で決め、両方を同じリクエストで使えます。
<!-- ノート: 単元の課題の確認Aで、この組み合わせを使います。 -->
