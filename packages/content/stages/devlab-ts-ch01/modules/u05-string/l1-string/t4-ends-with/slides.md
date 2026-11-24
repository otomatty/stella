---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 5-1-4
title: 終わりを確かめる
takeaway: "文字列.endsWith(文字) は、その文字で終わっていれば true です。"
introduces: ["endsWith"]
requires: ["const", "文字列", "メソッド", "引数", "boolean", "toLowerCase"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 5-1-4 終わりを確かめる

<!-- ノート: この動画では、文字列の終わりを確かめる方法を学びます。 -->

---

# 連絡の宛先を分ける

連絡の宛先を一覧にすると、個人宛てと部署宛てが混ざります。宛先の名前のうち、部署宛てに共通する部分はどこでしょうか。

<!-- ノート: 連絡の宛先を、カードに並べました。 -->

---

# 覚えること

文字列.endsWith(文字) は、その文字で終わっていれば true です。

<!-- ノート: 文字列.endsWith(文字) は、その文字で終わっていれば true です。 -->

---

# 終わりを確かめる

```ts
// 宛先の名前がチームで終わるか確かめる
const isGroup = "制作チーム".endsWith("チーム");
```

<!-- ノート: 宛先として書かれているのは、制作チームです。 末尾の三文字が、指定したチームと一致しました。 一致したので、結果は true になります。 -->

---

# 大文字と小文字

英字の大文字と小文字は区別します。同じものとして扱いたいときは、先に同じ表記にそろえます。

参考資料は[サバイバルTypeScriptの string 型](https://typescriptbook.jp/reference/values-types-variables/string)です。コード例は教材用に作成しています。

<!-- ノート: 英字の大文字と小文字は区別します。同じものとして扱いたいときは、先に同じ表記にそろえます。 -->

---

<!-- _class: summary -->
# まとめ

文字列.endsWith(文字) は、その文字で終わっていれば true です。

<!-- ノート: 文字列.endsWith(文字) は、その文字で終わっていれば true です。 -->
