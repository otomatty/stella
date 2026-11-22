---
sourceRefs: [SRC-typescriptbook-statements-for-of, SRC-typescriptbook-values-types-variables-number]
id: 1-2-7
title: 回数を決めてくり返す
takeaway: "0 から始めて < n まで進めると、ちょうど n 回くり返せます。"
introduces: ["<"]
requires: ["let", "for", "++", "+=", "true", "false", "文字列", "*=", "関数", "引数", "export", "number", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-7 回数を決めてくり返す

<!-- ノート: ゼロから小なりで進む for を読んで、何回動くかを言える。 -->

---

# なわとびを三回跳ぶ

なわとびを跳ぶたび、次の回に進みます。

番号を 0 から振ると、3 回目の番号はいくつでしょうか。

<!-- ノート: 最初に跳ぶ回に、ゼロの番号を付けます。番号を 0 から振ると、3 回目の番号はいくつでしょうか。 -->

---

# 覚えること

0 から始めて < n まで進めると、ちょうど n 回くり返せます。

<!-- ノート: 印を入れる変数を先に作ります。番号はゼロから始まり、三は含めないので三回です。 -->

---

# 小なりで回数を決める

```ts
// ゼロから三の手前まで一ずつ増やす
for (let i = 0; i < 3; i++) {
  // 今の文字列の後ろに印と空白をつなぐ
  log += "ok ";
}
```

<!-- ノート: 印を入れる変数を先に作ります。番号はゼロから始まり、三は含めないので三回です。 -->

---

# 最初から条件に合わないと

回数が 0 なら、最初の条件が `false` になり、一度も実行しません。

参考はサバイバルTypeScriptの[for-of文](https://typescriptbook.jp/reference/statements/for-of)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)です。説明と例は教材用に独自作成しています。

<!-- ノート: ゼロ回のときは、くり返しの前に入れた値が残ります。 -->

---

<!-- _class: summary -->
# まとめ

0 から始めて < n まで進めると、ちょうど n 回くり返せます。

<!-- ノート: 0 から始めて < n まで進めると、ちょうど n 回くり返せます。 -->
