---
sourceRefs: [SRC-typescriptbook-statements-for-of, SRC-typescriptbook-values-types-variables-number]
id: 1-2-5
title: 逆向きに数える
takeaway: "i-- で 1 ずつ減らし、>= で終わりを決めると、大きい数から数えられます。"
introduces: ["--", ">="]
requires: ["let", "for", "true", "false", "+=", "変数"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-5 逆向きに数える

<!-- ノート: 逆向きの for を読んで、値の順番と止まる値を言える。 -->

---

# 大きい数から数える

打ち上げの前、発射台の表示が 5 になりました。

どの順番で表示が変わるでしょうか。

<!-- ノート: 打ち上げ前に、5 から数え始めます。どの順番で表示が変わるでしょうか。 -->

---

# 覚えること

i-- で 1 ずつ減らし、>= で終わりを決めると、大きい数から数えられます。

<!-- ノート: `>=` は「以上」です。`i--` で一周ごとに 1 減らします。 -->

---

# 以上と減らす記号を使う

```ts
// 五から一まで一ずつ減らす
for (let i = 5; i >= 1; i--) {
  // その回の番号を表示する
  console.log(i);
}
```

<!-- ノート: `>=` は「以上」です。`i--` で一周ごとに 1 減らします。 -->

---

# 一の周も実行する

`i` が 1 なら条件は `true` です。0 になったら `false` で止まります。

参考はサバイバルTypeScriptの[for-of文](https://typescriptbook.jp/reference/statements/for-of)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)です。説明と例は教材用に独自作成しています。

<!-- ノート: 続ける条件に一を含めたので、一の回にも中身を実行します。 -->

---

<!-- _class: summary -->
# まとめ

i-- で 1 ずつ減らし、>= で終わりを決めると、大きい数から数えられます。

<!-- ノート: i-- で 1 ずつ減らし、>= で終わりを決めると、大きい数から数えられます。 -->
