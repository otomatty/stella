---
sourceRefs: [SRC-claude-docs-refusals-20261031, SRC-claude-docs-stop-reasons-20261031]
id: 1-3-3
title: 拒否された応答
takeaway: "stop_reason が refusal の応答は、エラーではなく拒否として扱います。"
introduces: [refusal, 拒否]
requires: [stop_reason]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 拒否された応答
<!-- ノート: Claude が答えを断ったときの扱いを確かめます。 -->
---
# エラー処理に届かない
例外の処理だけを用意していて、断られた応答に気づきませんでした。
<!-- ノート: 拒否は HTTP のエラーとしては返りません。 -->
---
# 拒否として扱う
stop_reason が refusal の応答は、エラーではなく拒否として扱います。
<!-- ノート: 拒否は、HTTP 200 の普通の応答として返ります。 -->
---
# 拒否の応答
```json
{ "content": [], "stop_reason": "refusal",
  "stop_details": { "type": "refusal", "category": "cyber", "explanation": "…" } }
```
<!-- ノート: stop_details が理由を表します。explanation は表示する文で、中身で分岐しません。 -->
---
# 拒否されたときにすること
- 拒否されたことを、利用者に伝える
- 必要なら、別のモデルで送り直す
<!-- ノート: 別のモデルでの送り直し方は、公式ドキュメントの Refusals and fallback で確かめます。 -->
---
<!-- _class: summary -->
# まとめ
stop_reason が refusal の応答は、エラーではなく拒否として扱います。
<!-- ノート: 拒否への備えは、安全性の単元でも扱います。 -->
