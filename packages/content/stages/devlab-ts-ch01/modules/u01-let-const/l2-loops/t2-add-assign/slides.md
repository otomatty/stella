---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number]
id: 1-2-2
title: 足して入れ直す
takeaway: "+= は足して入れ直し、++ は 1 増やします。"
introduces: ["+=", "++"]
requires: ["let", "再代入", "足し算", "変数"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-2 足して入れ直す

<!-- ノート: += と ++ を使った行を読んで、変数の値がどう変わるかを言える。 -->

---

# 貯金箱に百円を入れる

貯金箱に 200 円入っています。

さらに 100 円入れたあと、どうやって中身の金額を求めるでしょうか。

<!-- ノート: 貯金箱には、すでに 200 円入っています。さらに 100 円入れたあと、どうやって中身の金額を求めるでしょうか。 -->

---

# 覚えること

+= は足して入れ直し、++ は 1 増やします。

<!-- ノート: `total += 100` は `total = total + 100` と同じです。増やす量が 1 なら `count++` とも書けます。 -->

---

# プラスイコールで足して入れ直す

```ts
// 現在の貯金額を作る
let total = 200;
// 貯金額に百円を足して入れ直す
total += 100;
```

<!-- ノート: `total += 100` は `total = total + 100` と同じです。増やす量が 1 なら `count++` とも書けます。 -->

---

# 一つ増やす

スタンプが 4 個のとき、`count++` を実行すると 5 個になります。

参考はサバイバルTypeScriptの[letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)です。説明と例は教材用に独自作成しています。

<!-- ノート: プラスプラスの右には、足す数を書きません。 -->

---

<!-- _class: summary -->
# まとめ

+= は足して入れ直し、++ は 1 増やします。

<!-- ノート: += は足して入れ直し、++ は 1 増やします。 -->
