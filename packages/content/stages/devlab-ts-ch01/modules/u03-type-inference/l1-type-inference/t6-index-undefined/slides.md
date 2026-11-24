---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-inference]
id: 3-1-6
title: 1文字目が無いかもしれない
takeaway: "文字列[0] の型は string | undefined です。空の文字列には1文字目が無いからです。"
introduces: []
requires: ["添字", "charAt", "string", "undefined", "ユニオン型", "let"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 3-1-6 1文字目が無いかもしれない

<!-- ノート: この動画では、1文字目が無いかもしれない場合を学びます。 -->

---

# 名札から先頭の印を取る

受付では、名札の先頭の文字を整理用の印に使います。名前がまだ入っていない名札も届きます。

<!-- ノート: 受付で、名前の書かれた名札を預かりました。文字の並びの、いちばん左に目を向けます。 -->

---

# 覚えること

文字列[0] の型は string | undefined です。空の文字列には1文字目が無いからです。

<!-- ノート: 文字の位置を表す番号は、添字でした。角かっこの中に番号を書く方法もあります。先頭に文字があれば、取り出した値は文字列です。空なら、取り出した値は undefined になります。 -->

---

# 角かっこで添字を書く

```ts
// 名札の文字列を用意する
let badgeText = "東受付";
// 名札の先頭にある文字を取り出す
const badgeMark = badgeText[0];
```

<!-- ノート: 名札の文字列は、東受付です。0 番目にあるのは、東の文字になります。空の名札なら、取り出せる文字がありません。この課題の設定では、型に値が無い場合も入ります。 -->

---

# 文字が無い場合も型に入る

`badgeMark` の値は `"東"` です。`badgeText` が空なら値は `undefined` です。どちらも、推論された `string | undefined` に含まれます。

参考資料は[サバイバルTypeScript「型推論」](https://typescriptbook.jp/reference/values-types-variables/type-inference)です。

<!-- ノート: `badgeMark` の値は `"東"` です。`badgeText` が空なら値は `undefined` です。どちらも、推論された `string | undefined` に含まれます。 -->

---

<!-- _class: summary -->
# まとめ

文字列[0] の型は string | undefined です。空の文字列には1文字目が無いからです。

<!-- ノート: 文字列[0] の型は string | undefined です。空の文字列には1文字目が無いからです。 -->
