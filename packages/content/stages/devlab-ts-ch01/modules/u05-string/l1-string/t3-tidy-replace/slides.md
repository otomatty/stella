---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 1-5-3
title: 整える・置き換える
takeaway: "空白や大文字小文字をそろえ、置き換える範囲を選びます。"
introduces: ["trim", "toLowerCase", "replaceAll", "replace", "正規表現"]
requires: ["const", "文字列", "string", "メソッド", "引数", "戻り値", "型注釈"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-5-3 整える・置き換える

<!-- ノート: コードと値の動きから、整える・置き換える書き方を確かめます。 -->

---

# 入力の表記をそろえる

会員の入力は `"  Sales Desk  "` です。

前後の空白と、英字の大きさをそろえるには？

<!-- ノート: 部署名などの入力をそろえる仕事を考えます。問いの答えはまだ出しません。 -->

---

# 覚えること

空白や大文字小文字をそろえ、置き換える範囲を選びます。

<!-- ノート: 空白や大文字小文字をそろえ、置き換える範囲を選びます。 -->

---

# そろえた値を受け取る

```ts
// 入力 input を作り、"  Sales Desk  " を入れる
const input = "  Sales Desk  ";
// 前後の空白を取り、小文字にして表示する
console.log(input.trim().toLowerCase());
// 結果: "sales desk"
```

途中の空白は残ります。

<!-- ノート: trim は前後の空白だけを取り除きます。toLowerCase は英字を小文字にします。途中の空白と元の文字列は変わりません。 -->

---

# 最初だけか、すべてか

`"A-1-B-2"` を操作します。

`.replace("-", "")` は `"A1-B-2"`。

`.replaceAll("-", "")` は `"A1B2"`。

`.replace(/[0-9]/g, "")` は `"A--B-"`。

参考: サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)。型と表記の背景資料です。操作と業務例は書き方ガイドを素材に再構成しています。

<!-- ノート: replace に文字列を渡して全部消えると思うのは誤りです。正規表現は探す文字の種類や並びを表す書き方です。数字一文字を探す [0-9] と、すべてを扱う g を使います。問9・問10・問18で操作を選んでください。 -->

---

<!-- _class: summary -->
# まとめ

空白や大文字小文字をそろえ、置き換える範囲を選びます。

<!-- ノート: 空白や大文字小文字をそろえ、置き換える範囲を選びます。 -->
