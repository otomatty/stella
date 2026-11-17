---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-values-types-variables-truthy-falsy-values]
id: 1-6-1
title: 条件を組み合わせて返す
takeaway: "比べた結果を組み合わせると、条件をそのまま返せます。"
introduces: ["test"]
requires: ["return", "boolean", "&&", "||", "!", "正規表現", "const", "関数", "型注釈", "true", "false", ">=", ">"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-6-1 条件を組み合わせて返す

<!-- ノート: 比較は真か偽を作ります。かつは両方、またははどちらかが真なら真です。でないは真偽を逆にします。正規表現の test は、合う部分が含まれるかを調べます。 -->

---

# 仕事で確かめたいこと

空席があっても、休業日なら予約できるでしょうか。

<!-- ノート: 身近な困りごとから考えます。答えはまだ示さず、書き方を使って確かめます。 -->

---

# 覚えること

比べた結果を組み合わせると、条件をそのまま返せます。

<!-- ノート: 比較は真か偽を作ります。かつは両方、またははどちらかが真なら真です。でないは真偽を逆にします。正規表現の test は、合う部分が含まれるかを調べます。 -->

---

# 書き方を見る

```ts
// 予約を受け付けられるかを作る
const canBook = 2 > 0 && !true;
```

<!-- ノート: 比較は真か偽を作ります。かつは両方、またははどちらかが真なら真です。でないは真偽を逆にします。正規表現の test は、合う部分が含まれるかを調べます。 -->

---

# よくある間違い

`: boolean` の関数で数値を返すとエラーです。比べる式にして返します。

参考: サバイバルTypeScript [boolean](https://typescriptbook.jp/reference/values-types-variables/boolean)・[truthy-falsy-values](https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values)。説明・業務例・知識問題は教材用に構成しています。

<!-- ノート: 問題の答えを写すのではなく、使う値に合う書き方を選びます。 -->

---

<!-- _class: summary -->
# まとめ

比べた結果を組み合わせると、条件をそのまま返せます。

<!-- ノート: 比べた結果を組み合わせると、条件をそのまま返せます。 -->
