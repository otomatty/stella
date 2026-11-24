---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-inference]
id: 3-1-8
title: 小数を桁でそろえる
takeaway: "数.toFixed(1) で、小数第1位までの文字列になります。"
introduces: ["toFixed"]
requires: ["小数", "number", "string", "メソッド"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 3-1-8 小数を桁でそろえる

<!-- ノート: この動画では、小数の桁をそろえる方法を学びます。 -->

---

# 気温の表示をそろえる

気温を画面に並べます。値によって小数の桁数が違うと、表の数字が読みづらくなることがあります。

<!-- ノート: 測った気温を、画面に並べました。測る場所によって、値の桁数が違います。 -->

---

# 覚えること

数.toFixed(1) で、小数第1位までの文字列になります。

<!-- ノート: 小数の桁数をそろえる道具が、toFixed です。表示したい数の後ろに、ドットを付けます。丸かっこの中は、小数点の後ろに並べる桁の数です。小数第1位までなら、丸かっこに 1 を入れましょう。 -->

---

# 丸かっこに桁数を書く

```ts
// 測った気温を数として用意する
const temperature = 16.78;
// 小数第1位までの表示用文字列にする
const temperatureText = temperature.toFixed(1);
```

<!-- ノート: 測った気温として、16.78 を用意しました。指定するのは、小数点の後ろを一桁にすることです。丸めた結果は、16.8 と表示されます。表示に使う値の型は、string です。 -->

---

# 表示用の型は string

`temperatureText` の値は `"16.8"`、型は `string` です。

参考資料は[サバイバルTypeScript「型推論」](https://typescriptbook.jp/reference/values-types-variables/type-inference)です。

<!-- ノート: `temperatureText` の値は `"16.8"`、型は `string` です。 -->

---

<!-- _class: summary -->
# まとめ

数.toFixed(1) で、小数第1位までの文字列になります。

<!-- ノート: 数.toFixed(1) で、小数第1位までの文字列になります。 -->
