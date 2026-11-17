---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-statements-if-else]
id: 1-1-9
title: 条件で選ぶ
takeaway: "条件で値を選び、文字列への変換や四捨五入をして返せます。"
introduces: ["条件演算子", "String()", "Math.round", "boolean", "||"]
requires: ["const", "let", "if", ">=", ">", "true", "false", "文字列", "string", "number", "for", "*="]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-9 条件で選ぶ

<!-- ノート: 条件で値を選び、文字列への変換や四捨五入をして返せます。 -->

---

# 仕事で使う場面

会員には案内を、それ以外の人には番号を表示するには？

<!-- ノート: 身近な問いを示し、答えはまだ言いません。 -->

---

# 覚えること

条件で値を選び、文字列への変換や四捨五入をして返せます。

<!-- ノート: 条件で値を選び、文字列への変換や四捨五入をして返せます。 -->

---

# 書き方を読む

```ts
// 会員かどうかを受け取る関数を作る
function label(member: boolean): string {
  // 会員なら特典、それ以外なら一般を返す
  return member ? "特典" : "一般";
}
```

<!-- ノート: 各行の役割を日本語のコメントで確かめ、値を追います。 -->

---

# 選ぶ値と丸めの境目

`条件 ? A : B` は、真なら A、偽なら B を選びます。
`boolean` は真偽の型、`||` は「または」です。
正の数の `Math.round(2.4)` は 2、`Math.round(2.5)` は 3 です。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)・[boolean型](https://typescriptbook.jp/reference/values-types-variables/boolean)・[if-else文](https://typescriptbook.jp/reference/statements/if-else)。概念を参照し、説明と例は教材用に独自作成しています。

<!-- ノート: 文字列を返す関数では数値を String で変換します。四捨五入は正の数で確かめます。 -->

---

<!-- _class: summary -->
# まとめ

条件で値を選び、文字列への変換や四捨五入をして返せます。

<!-- ノート: 条件で値を選び、文字列への変換や四捨五入をして返せます。 -->
