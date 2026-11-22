---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
id: 1-1-10
title: 小数点以下を切り上げる
takeaway: "Math.ceil を使うと、小数点以下を切り上げた整数になります。"
introduces: ["Math.ceil", "切り上げ"]
requires: ["Math.floor", "切り捨て", "割り算", "小数", "整数"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-10 小数点以下を切り上げる

<!-- ノート: 小数点以下を切り上げるを、身近な例とコードで確かめます。 -->

---

# 箱はいくつ必要？

25 本の瓶を、10 本入りの箱に詰めます。

全部入れるには、何箱必要でしょうか。

<!-- ノート: 割り算の結果は 2.5 です。箱を半分だけ用意することはできません。答えはまだ言いません。 -->

---

# 覚えること

Math.ceil を使うと、小数点以下を切り上げた整数になります。

端数があれば、1 つ上の整数になります。

<!-- ノート: Math.ceil は、かっこの中の数を切り上げて返す関数です。2.5 を渡すと、1 つ上の整数の 3 が戻ります。Math.floor と同じく、最初から用意されています。 -->

---

# Math.ceil で切り上げる

```ts
// 箱の数 boxes を作り、2.5 を切り上げる
const boxes = Math.ceil(2.5);
```

<!-- ノート: Math.ceil は、かっこの中の数を切り上げて返す関数です。2.5 を渡すと、1 つ上の整数の 3 が戻ります。Math.floor と同じく、最初から用意されています。 -->

---

# 切り捨てとくらべる

`Math.floor(2.5)` は `2`、`Math.ceil(2.5)` は `3` です。

もとの数が整数なら、どちらを使っても変わりません。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と例は教材用に独自作成しています。

<!-- ノート: floor は床、ceil は天井 (ceiling) を短くした名前です。四捨五入ではないので、2.1 を切り上げても 3 です。 -->

---

<!-- _class: summary -->
# まとめ

Math.ceil を使うと、小数点以下を切り上げた整数になります。

<!-- ノート: Math.ceil を使うと、小数点以下を切り上げた整数になります。 -->
