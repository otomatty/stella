---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
id: 4-1-1
title: 計算の道具
takeaway: "型注釈で数の入口と出口を決め、目的に合う計算の道具を選べます。"
introduces: ["Math.abs", "絶対値", "累乗", "**", "平方根", "Math.sqrt", "Math.min", "Math.max", "Math.hypot"]
requires: ["型注釈", "引数", "戻り値", "number", "const", "return", "関数"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 4-1-1 計算の道具

<!-- ノート: 型注釈で数の入口と出口を決め、目的に合う計算の道具を選べます。 -->

---

# 仕事の場面で考える

予定より在庫が少ないとき、ずれの大きさをどう伝えますか。

<!-- ノート: 身近な場面を問いにします。まだ答えは示しません。 -->

---

# 覚えること

- 入口と出口の型は `number`。`Math.abs` はゼロからの距離
- `**` は累乗、`Math.sqrt` は平方根、`Math.hypot` は斜めの長さ
- 下限には `Math.max`、上限には `Math.min`

<!-- ノート: 引数と戻り値の型は number です。絶対値はゼロからの距離です。累乗、平方根、範囲の制限で道具を選びます。 -->

---

# 最小のコード

```ts
// ずれ gap を作り、-3 の絶対値を入れる
const gap = Math.abs(-3);
// ずれを表示する
console.log(gap);
// 結果: 3
```

<!-- ノート: コメントとコードを一行ずつ対応させ、最後の結果を確かめます。 -->

---

# よくある間違い

Math.max で上限を守ろうとしても、大きい値が残ります。上限には Math.min を使います。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と業務の例は教材用に独自作成しています。

<!-- ノート: Math.max で上限を守ろうとしても、大きい値が残ります。上限には Math.min を使います。 -->

---

<!-- _class: summary -->
# まとめ

型注釈で数の入口と出口を決め、目的に合う計算の道具を選べます。

<!-- ノート: 問題では型注釈とテストの値を先に確かめ、中の処理を自分で書きます。 -->
