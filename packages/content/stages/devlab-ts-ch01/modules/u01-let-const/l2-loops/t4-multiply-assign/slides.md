---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number]
id: 1-2-4
title: 掛けて入れ直す
takeaway: "*= は掛けて入れ直します。掛け算を重ねるときは 1 から始めます。"
introduces: ["*="]
requires: ["let", "再代入", "掛け算", "アスタリスク", "for", "<=", "++", "関数", "引数", "export", "number", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-4 掛けて入れ直す

<!-- ノート: アスタリスクイコールの行を読んで、掛け算を重ねた結果を言える。 -->

---

# 紙の重なりを数える

紙を半分に折ると、重なった部分に厚みが出ます。

もう一度折ると、何枚分が重なっているでしょうか。

<!-- ノート: 折る前は、紙が一枚です。もう一度折ると、何枚分が重なっているでしょうか。 -->

---

# 覚えること

*= は掛けて入れ直します。掛け算を重ねるときは 1 から始めます。

<!-- ノート: `result *= 2` は、`result = result * 2` と同じです。 -->

---

# アスタリスクイコールで掛ける

```ts
// 最初の枚数を入れる
let result = 1;
// 重なった枚数を二倍にする
result *= 2;
```

<!-- ノート: `result *= 2` は、`result = result * 2` と同じです。 -->

---

# ゼロから始めると

どんな数を掛けても、ゼロのままです。

参考はサバイバルTypeScriptの[letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)です。説明と例は教材用に独自作成しています。

<!-- ノート: 掛け算を重ねるときは、最初に一を入れましょう。 -->

---

<!-- _class: summary -->
# まとめ

*= は掛けて入れ直します。掛け算を重ねるときは 1 から始めます。

<!-- ノート: *= は掛けて入れ直します。掛け算を重ねるときは 1 から始めます。 -->
