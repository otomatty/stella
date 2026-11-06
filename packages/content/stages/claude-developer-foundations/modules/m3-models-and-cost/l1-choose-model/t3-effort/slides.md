---
sourceRefs: [SRC-claude-docs-choosing-model-20261031, SRC-claude-docs-effort-20261031, SRC-claude-docs-effort-set-20261031]
id: 3-1-3
title: かける量を決める
takeaway: "effort で、1 つのモデルが応答にかけるトークンの量を調整します。"
introduces: [effort, output_config]
requires: [モデルの選択, トークン, 評価]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# かける量を決める
<!-- ノート: モデルを替えずに、性能と費用の釣り合いを変える方法です。 -->
---
# 替える前に
費用を下げたくて、小さいモデルに替えました。質が足りず、元に戻すことになりました。
<!-- ノート: モデルを替えなくても、使うトークンの量は変えられます。 -->
---
# effort で調整する
effort で、1 つのモデルが応答にかけるトークンの量を調整します。
<!-- ノート: 値は low・medium・high・xhigh・max です。上げるほど深く取り組み、下げるほど速く安くなります。 -->
---
# output_config に書く
```js
const message = await client.messages.create({
  model, max_tokens: 4096, messages,
  output_config: { effort: "low" },
});
```
<!-- ノート: 本文・ツールの呼び出し・考える過程の、すべての出力に効きます。 -->
---
# 既定の値
- 多くのモデル: high
- Opus 5.5・Haiku 5.5: medium
<!-- ノート: 既定の値を書くのは、effort を省くのと同じです。モデルを替えるより、effort の調整がよい手段になることが多いとされています。 -->
---
<!-- _class: summary -->
# まとめ
effort で、1 つのモデルが応答にかけるトークンの量を調整します。
<!-- ノート: どの値がよいかは、評価のセットで確かめます。 -->
