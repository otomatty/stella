---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-statements-if-else]
id: 1-3-8
title: はいかいいえの値
takeaway: "true と false の 2 つだけをとる種類が boolean です。"
introduces: ["boolean"]
requires: ["true", "false", "型", "型注釈", "const", "if", ">", "引数"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-8 はいかいいえの値

<!-- ノート: この動画では、はいかいいえを表す値を学びます。 -->

---

# 会員かどうかを表すには？

カードを持つ会員には、はいが当てはまります。

コードでは、どう表すのでしょうか。

<!-- ノート: カードを持つ会員には、はいが当てはまります。 会員かどうかを表すには？ -->

---

# 覚えること

true と false の 2 つだけをとる種類が boolean です。

<!-- ノート: true と false の 2 つだけをとる種類が boolean です。 -->

---

# 型注釈に boolean を書く

```ts
// 会員であることを変数に入れる
const isMember: boolean = true;
```

<!-- ノート: isMember は、会員かどうかを表す名前です。 -->

---

# この比較の結果は、どちらの値でしょうか。

```ts
// 比較した結果を変数に入れる
const ok: boolean = 3 > 5;
```

答えは false です。

<!-- ノート: 3 は 5 より大きくありません。 大小を比べた結果も、boolean の値です。 -->

---

<!-- _class: summary -->
# まとめ

true と false の 2 つだけをとる種類が boolean です。

<!-- ノート: true と false の 2 つだけをとる種類が boolean です。 -->
