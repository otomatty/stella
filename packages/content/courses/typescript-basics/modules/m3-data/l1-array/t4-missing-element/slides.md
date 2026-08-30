---
id: 3-1-4
title: 存在しない要素はundefined
takeaway: "範囲外のインデックスはundefinedになるが、型は教えてくれない"
introduces: []
requires: [インデックス, 配列, undefined, length, 型]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 3-1-4
# 存在しない要素はundefined

TypeScript入門 — Module 3 / レッスン3-1

<!-- ノート: レッスン3-1の最後です。TypeScriptが守ってくれない、数少ない場面の1つを正直に扱います。 -->

---

## なぜ必要か

- 「TypeScriptを使っていれば安全」と思い込むと、ここで足をすくわれる
- 実行時エラーの原因になりやすい

<!-- ノート: つかみ。ここまで型に守られてきた分、守られない場所を知っておくことが大事。教材として都合の悪い話を隠さないほうが、現場で役に立つ。 -->

---

## 結論

**範囲外のインデックスは`undefined`になるが、型は教えてくれない**

- 実際の値は`undefined`
- なのに型の上では`string`のまま

<!-- ノート: 結論を先に言い切る。型と実際の値がズレる珍しいケース。既定の設定では、コンパイラーは配列の範囲までは見てくれない。 -->

---

## 最小のコード

```ts
const items = ["コーヒー", "紅茶"];

console.log(items[5]); // => undefined
const name: string = items[5]; // エラーにならない
```

- 型は`string`だと言っているのに、中身は`undefined`

<!-- ノート: 2行目がエラーにならないことを実演する。Playgroundでitems[5]にカーソルを乗せるとstringと表示される。ここが落とし穴。1-6で学んだstrictNullChecksも、配列の範囲までは面倒を見てくれない。 -->

---

## 対処: 使う前に件数を確かめる

```ts
const items = ["コーヒー", "紅茶"];
const index = 5;

if (index < items.length) {
  console.log(items[index]);
} else {
  console.log("その商品はありません");
}
// => "その商品はありません"
```

<!-- ノート: 対比枠。型が守ってくれない以上、自分で確かめるしかない。3-1-3のlengthと2-2-3のelseがここで合流する。tsconfigのnoUncheckedIndexedAccessという設定で型を厳しくもできるが、それはModule 9で触れる。 -->

---

<!-- _class: summary -->

## まとめ

**範囲外のインデックスは`undefined`になるが、型は教えてくれない**

<!-- ノート: 結論の再掲だけ。レッスン3-1はここまで。次は配列を実際に使っていくと予告して締める。 -->
