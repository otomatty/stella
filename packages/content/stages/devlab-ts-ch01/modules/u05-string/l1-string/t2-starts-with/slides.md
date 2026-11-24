---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 5-1-2
title: 始まりを確かめる
progressRevision: 2
takeaway: "文字列.startsWith(文字) は、その文字で始まっていれば true です。"
introduces: ["startsWith"]
requires: ["const", "文字列", "メソッド", "引数", "boolean"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 5-1-2 始まりを確かめる

<!-- ノート: この動画では、文字列の始まりを確かめる方法を学びます。 -->

---

# 受付票をまとめる

受付票の見出しには、窓口名と用件が続けて書かれています。会計の窓口の票を集めるとき、どこに注目すればよいでしょうか。

<!-- ノート: 用件ごとに受付票を用意しました。 -->

---

# 覚えること

文字列.startsWith(文字) は、その文字で始まっていれば true です。

<!-- ノート: 文字列.startsWith(文字) は、その文字で始まっていれば true です。 -->

---

# 始まりを確かめる

```ts
// 受付票の見出しが会計から始まるか確かめる
const forCashier = "会計窓口".startsWith("会計");
```

<!-- ノート: 調べる見出しは、会計窓口です。 先頭の二文字が会計と一致しました。 一致したので、結果は true になります。 -->

---

# 途中だけの一致

途中に同じ文字があっても、先頭で一致しなければ `false` です。

参考資料は[サバイバルTypeScriptの string 型](https://typescriptbook.jp/reference/values-types-variables/string)です。コード例は教材用に作成しています。

<!-- ノート: 途中に同じ文字があっても、先頭で一致しなければ `false` です。 -->

---

<!-- _class: summary -->
# まとめ

文字列.startsWith(文字) は、その文字で始まっていれば true です。

<!-- ノート: 文字列.startsWith(文字) は、その文字で始まっていれば true です。 -->
