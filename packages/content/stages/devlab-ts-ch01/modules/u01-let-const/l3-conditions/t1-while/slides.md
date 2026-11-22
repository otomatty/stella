---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-statements-if-else]
id: 1-3-1
title: 条件が続く間くり返す
progressRevision: 2
takeaway: "while は、条件が true の間だけくり返します。"
introduces: ["while", ">", "-"]
requires: ["let", "再代入", "true", "false", "for", "割り算"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-1 条件が続く間くり返す

<!-- ノート: この動画では、条件が続く間くり返す書き方を学びます。 -->

---

# 水を飲み終わるのはいつ？

水が残っているかを先に確かめます。

コードでは、どう表すのでしょうか。

<!-- ノート: 水が残っているかを先に確かめます。 水を飲み終わるのはいつ？ -->

---

# 覚えること

while は、条件が true の間だけくり返します。

<!-- ノート: while は、条件が true の間だけくり返します。 -->

---

# 条件と更新を書く

```ts
// 水が残る間くり返す
while (rest > 0) {
  // ひと口分を引く
  rest = rest - 100;
}
```

<!-- ノート: 引いたあとの量が、次に確かめる値です。 -->

---

# くり返しが終わると、今の数はいくつでしょうか。

```ts
// 最初の数を入れる
let n = 8;
// 今の数が1より大きい間くり返す
while (n > 1) {
  // 今の数を半分にする
  n = n / 2;
}
```

答えは 1 です。

<!-- ノート: 8 を半分にして、4 になります。 4 と 2 のときも中に入りました。 -->

---

<!-- _class: summary -->
# まとめ

while は、条件が true の間だけくり返します。

<!-- ノート: while は、条件が true の間だけくり返します。 -->
