---
sourceRefs: [SRC-claude-docs-tool-errors-20261031]
id: 5-1-3
title: 失敗を返す
takeaway: "ツールが失敗したら、is_error を付けた結果で、何が起きたかを返します。"
introduces: [is_error]
requires: [tool_result, ツール使用のループ]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 失敗を返す
<!-- ノート: ツールの実行が失敗したときの扱いです。 -->
---
# 全体が止まった
在庫の API が落ちていたとき、ツールの例外でアシスタント全体が止まりました。
<!-- ノート: 利用者には、何の説明も返りませんでした。 -->
---
# is_error で返す
ツールが失敗したら、is_error を付けた結果で、何が起きたかを返します。
<!-- ノート: Claude は失敗を受け取り、利用者への説明や、別のやり方を考えます。 -->
---
# 失敗の結果
```js
{ type: "tool_result", tool_use_id: block.id, is_error: true,
  content: "在庫の API に接続できません。少し待ってから試してください" }
```
<!-- ノート: 「失敗」だけでなく、何が起き、次に何をすればよいかを書きます。 -->
---
<!-- _class: summary -->
# まとめ
ツールが失敗したら、is_error を付けた結果で、何が起きたかを返します。
<!-- ノート: 入力が足りない呼び出しも、失敗として返すと、Claude が直して呼び直します。 -->
