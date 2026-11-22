---
sourceRefs: [SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-string]
id: 1-3-5
title: 数を文字列にする
takeaway: "String() で、数を文字列に変えられます。"
introduces: ["String()"]
requires: ["文字列", "string", "number", "呼び出す", "戻り値", "引数", "const", "文字列の連結"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-5 数を文字列にする

<!-- ノート: この動画では、数を文字列に変える方法を学びます。 -->

---

# 番号の扱いは同じ？

受付で番号を受け取ります。

コードでは、どう表すのでしょうか。

<!-- ノート: 受付で番号を受け取ります。 番号の扱いは同じ？ -->

---

# 覚えること

String() で、数を文字列に変えられます。

<!-- ノート: String() で、数を文字列に変えられます。 -->

---

# String で文字にする

```ts
// 番号を文字列にする
const label = String(7);
```

<!-- ノート: 変えた文字列は、結果として戻ってくる値です。 -->

---

# どんな文字列ができるでしょうか。

```ts
// 番号を表示用の文字列にする
const sign = String(3) + "番";
```

答えは「3番」です。

<!-- ノート: 最初に数の 3 が渡ります。 戻ってくるのは、文字列の 3 です。 -->

---

<!-- _class: summary -->
# まとめ

String() で、数を文字列に変えられます。

<!-- ノート: String() で、数を文字列に変えられます。 -->
