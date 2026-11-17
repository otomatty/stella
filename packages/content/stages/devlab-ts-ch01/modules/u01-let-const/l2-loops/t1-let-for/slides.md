---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-statements-for-of]
id: 1-1-5
title: 入れ直す変数とくり返し
takeaway: "入れ直す変数を let で作り、for でくり返すと、値を少しずつ変えられます。"
introduces: ["let", "再代入", "for", "<=", "++", "+=", "*=", "true", "false"]
requires: ["const", "変数", "代入", "number", "関数", "引数", "戻り値"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-5 入れ直す変数とくり返し

<!-- ノート: 入れ直す変数を let で作り、for でくり返すと、値を少しずつ変えられます。 -->

---

# 仕事の中のくり返し

毎月 5000 円ずつ積み立てます。

同じ名前の金額を、どう増やせるでしょうか。

<!-- ノート: 身近な仕事での問いを示します。ここでは答えのコードをまだ示しません。 -->

---

# 覚えること

入れ直す変数を let で作り、for でくり返すと、値を少しずつ変えられます。

<!-- ノート: const で作った変数への再代入と対比して、let で作った変数の値が変わることを確かめます。条件が成り立つ結果は true、成り立たない結果は false です。 -->

---

# 値を追ってみる

```ts
// 在庫 stock を入れ直せる変数として作り、10 を入れる
let stock = 10;
// stock に 5 を足した数を入れ直す
stock = stock + 5;
```

`stock` は `15` になります。値を入れ直すことを再代入と呼びます。

<!-- ノート: const で作った変数への再代入と対比して、let で作った変数の値が変わることを確かめます。条件が成り立つ結果は true、成り立たない結果は false です。 -->

---

# const と let、for の順番

const の変数への再代入はエラーです。

for は、開始、条件、中身、更新、条件の順で進みます。
`<=` は同じ数を含み、`++` は一増やします。
`+=` は足して入れ直し、`*=` は掛けて入れ直します。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)。説明と例は教材用に独自作成しています。

<!-- ノート: const で作った変数への再代入と対比して、let で作った変数の値が変わることを確かめます。条件が成り立つ結果は true、成り立たない結果は false です。 問題の関数の形とテストで確かめる値を読み、自分で中身を書きます。 -->

---

<!-- _class: summary -->
# まとめ

入れ直す変数を let で作り、for でくり返すと、値を少しずつ変えられます。

<!-- ノート: 入れ直す変数を let で作り、for でくり返すと、値を少しずつ変えられます。 -->
