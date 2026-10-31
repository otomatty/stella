---
sourceRefs: [SRC-claude-docs-stop-reasons-20261031]
id: 1-3-2
title: 上限で切れた応答
takeaway: "stop_reason が max_tokens の応答は、途中で切れています。"
introduces: [途中で切れた応答]
requires: [stop_reason, max_tokens]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 上限で切れた応答
<!-- ノート: 出力の上限で止まった応答の扱いを確かめます。 -->
---
# 切れた JSON を読もうとした
応答の文字を JSON として読もうとして、エラーになりました。
<!-- ノート: 応答が途中で切れていたので、閉じかっこがありませんでした。 -->
---
# max_tokens は途中で切れている
stop_reason が max_tokens の応答は、途中で切れています。
<!-- ノート: 完成した答えとして使わずに、扱いを分けます。 -->
---
# 切れた応答を見分ける
```js
if (response.stop_reason === "max_tokens") {
  return { truncated: true, text: textOf(response) };
}
```
<!-- ノート: textOf は、テキストのブロックをつなぐ関数です。 -->
---
# 切れたときにすること
- max_tokens を上げて送り直す
- 受け取った分に続けて書かせる
<!-- ノート: どちらを選ぶかは、求める出力の長さで決めます。 -->
---
<!-- _class: summary -->
# まとめ
stop_reason が max_tokens の応答は、途中で切れています。
<!-- ノート: コンテキストウィンドウいっぱいで止まった応答も、途中で切れたものとして扱います。 -->
