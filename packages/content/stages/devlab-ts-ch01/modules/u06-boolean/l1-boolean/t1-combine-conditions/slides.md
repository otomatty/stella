---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-values-types-variables-truthy-falsy-values]
id: 6-1-1
title: 条件を組み合わせて返す
progressRevision: 2
takeaway: "比べた結果を && や || で組み合わせた式は、そのまま return できます。"
introduces: []
requires: ["return","boolean","&&","||","!","if","関数","型注釈","true","false",">=","<"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 6-1-1 条件を組み合わせて返す

<!-- ノート: この動画では、条件を組み合わせた結果を返す書き方を学びます。 -->

---

# 試合を始められる？

校庭は晴れています。選手はまだ8人です。天気だけで試合を始めてよいでしょうか。

<!-- ノート: 試合を始めるには、天気と選手の人数を確かめます。どちらか一方だけでは決まりません。 -->

---

# 覚えること

比べた結果を && や || で組み合わせた式は、そのまま return できます。

<!-- ノート: 「かつ」「または」「でない」で組み合わせた式も、結果は真偽値です。true と false のためだけに if で分ける必要はありません。 -->

---

# 晴れていて、9人そろったら始める

```ts
// 晴れていて、選手が9人以上そろったかを返す
function canStartGame(isSunny: boolean, players: number): boolean {
  // 天気と人数の条件を組み合わせて返す
  return isSunny && players >= 9;
}
```

<!-- ノート: isSunny は晴れているかを表します。players が9以上かを比べ、両方が true のときだけ true を返す式です。 -->

---

# 中止の条件も、そのまま返す

`isRainy || players < 9` は「雨、または9人未満」です。
`!canStartGame(isSunny, players)` なら、開始できるかの結果を逆にします。

複数のまとまりは `(isSunny && hasField) || (hasRoof && hasLights)` のようにかっこで示せます。

参考: サバイバルTypeScript [boolean](https://typescriptbook.jp/reference/values-types-variables/boolean)・[truthy-falsy-values](https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values)。説明とコード例は教材用に作成しています。

<!-- ノート: またはは、片方でも true なら true です。でないは真偽を逆にします。かっこを使うと、屋外と屋内のような条件のまとまりを読み取れます。 -->

---

<!-- _class: summary -->
# まとめ

比べた結果を && や || で組み合わせた式は、そのまま return できます。

<!-- ノート: 比べた結果を && や || で組み合わせた式は、そのまま return できます。 -->
