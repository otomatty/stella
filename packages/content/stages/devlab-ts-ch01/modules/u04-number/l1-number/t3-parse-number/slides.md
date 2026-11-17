---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
id: 1-4-3
title: 文字列から数を取り出す
takeaway: "文字列から整数を取り出し、NaN・有限の数・整数を区別できます。"
introduces: ["Number.parseInt", "NaN", "Number.isNaN", "Number.isFinite", "Infinity", "Number.isInteger"]
requires: ["const", "string", "number", "true", "false", "===", "!", "型注釈"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-4-3 文字列から数を取り出す

<!-- ノート: 文字列から整数を取り出し、NaN・有限の数・整数を区別できます。 -->

---

# 仕事の場面で考える

「12個」という文字列から、計算に使う数をどう取り出しますか。

<!-- ノート: 身近な場面を問いにします。まだ答えは示しません。 -->

---

# 覚えること

- `Number.parseInt` は先頭の整数を取り出す
- `Number.isNaN` は NaN、`Number.isFinite` は有限の数を調べる
- `Number.isInteger` は整数かを調べる

<!-- ノート: parseInt は先頭から整数を読みます。isNaN は NaN、isFinite は有限の数、isInteger は整数かを調べます。 -->

---

# 最小のコード

```ts
// 注文数 quantity に、先頭の整数を入れる
const quantity = Number.parseInt("12個", 10);
// 注文数を表示する
console.log(quantity);
// 結果: 12
```

<!-- ノート: コメントとコードを一行ずつ対応させ、最後の結果を確かめます。 -->

---

# よくある間違い

NaN と === で比べても、常に false です。Number.isNaN を使います。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と業務の例は教材用に独自作成しています。

<!-- ノート: NaN と === で比べても、常に false です。Number.isNaN を使います。 -->

---

<!-- _class: summary -->
# まとめ

文字列から整数を取り出し、NaN・有限の数・整数を区別できます。

<!-- ノート: 問題では型注釈とテストの値を先に確かめ、中の処理を自分で書きます。 -->
