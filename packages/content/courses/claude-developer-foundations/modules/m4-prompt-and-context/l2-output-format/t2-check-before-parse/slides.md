---
sourceRefs: [SRC-claude-docs-structured-considerations-20261031]
id: 4-2-2
title: 止まった理由を先に見る
takeaway: "構造化出力の応答は、stop_reason を確かめてから JSON として読みます。"
introduces: [スキーマに合わない出力]
requires: [構造化出力, stop_reason, refusal, 途中で切れた応答]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 止まった理由を先に見る
<!-- ノート: 構造化出力でも、スキーマどおりにならない応答があります。 -->
---
# 読もうとして例外
構造化出力なら必ず読めると思い、応答をそのまま JSON として読んでいました。ある日、例外で処理が止まりました。
<!-- ノート: その応答は、上限に届いて途中で切れていました。 -->
---
# stop_reason を先に
構造化出力の応答は、stop_reason を確かめてから JSON として読みます。
<!-- ノート: 拒否された応答と、max_tokens で切れた応答は、スキーマどおりとは限りません。 -->
---
# 確かめる順
```js
if (message.stop_reason !== "end_turn") {
  return { ok: false, reason: message.stop_reason };
}
return { ok: true, data: JSON.parse(text) };
```
<!-- ノート: refusal なら拒否として扱い、max_tokens で切れたときは上限を上げて送り直します。 -->
---
<!-- _class: summary -->
# まとめ
構造化出力の応答は、stop_reason を確かめてから JSON として読みます。
<!-- ノート: JSON 以外の出力の形も、指示の仕方で整えられます。 -->
