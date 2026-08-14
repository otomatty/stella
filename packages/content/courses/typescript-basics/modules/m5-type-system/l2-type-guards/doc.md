# レッスン5-2 型ガード

## このレッスンの目標

- [ ] 制御フロー分析の仕組みを説明できる
- [ ] `typeof`と`in`を場面に応じて使い分けられる
- [ ] 型ガード関数で判定を切り出せる

## 5-2-1 制御フロー分析

> **コンパイラーは分岐を追いかけて、その位置での型を決めている**

レッスン2-3で「`if`で型が確定する」と学びました。その裏側の仕組みです。

- **制御フロー分析** — コンパイラーが分岐を追いかけて型を決める仕組み
- **型ガード** — 型を狭める判定

```ts
const value: string | undefined = "コーヒー";

// ここでは string | undefined

if (value !== undefined) {
  // ここでは string
} else {
  // ここでは undefined
}
```

同じ変数なのに、**位置によって型が違います。** 型は変数ごとに1つ固定ではありません。Playgroundで3か所それぞれにカーソルを乗せると確認できます。

![分岐のたびに型が狭まっていく流れ図](t1-control-flow/assets/narrowing-flow.svg)

レッスン2-3で使った`if`も、レッスン4-1の早期リターンも、すべてこの仕組みの上で動いています。判定の書き方が違うだけです。

## 5-2-2 typeofによる型ガード

> **`typeof`で比べると、プリミティブ型のユニオンを絞り込める**

レッスン2-3で学んだのは「値があるか」の判定でした。ここでは「どの種類か」の判定です。同じ絞り込みでも判定の軸が違います。

```ts
const id: string | number = "A-1001";

if (typeof id === "string") {
  console.log(id.length); // ここでは string
} else {
  console.log(id * 2); // ここでは number
}
```

レッスン1-6で学んだ`typeof`は型名を文字列で返す演算子でした。その戻り値を比較すると、コンパイラーが型ガードとして認識してくれます。

5-1-1で使えなかった`length`が、`if`の中では使えています。`else`の側では`number`に確定しているので掛け算ができます。

ただし、**使えるのはプリミティブ型だけ**です。5-1-2で見たとおり、オブジェクト同士はどちらも`"object"`を返すので分けられません。

## 5-2-3 in演算子による型ガード

> **`in`でプロパティの有無を調べると、オブジェクトのユニオンを絞り込める**

5-1-3の判別可能なユニオン型は、自分で型を設計できるときの手です。ライブラリーや既存コードの型は、目印がないまま渡ってきます。そのときの手段が`in`です。

```
"プロパティ名" in オブジェクト
```

```ts
type Success = { data: string };
type Failure = { message: string };

const result: Success | Failure = { data: "OK" };

if ("data" in result) {
  console.log(result.data); // ここでは Success
} else {
  console.log(result.message); // ここでは Failure
}
```

`in`は「〜の中にあるか」を調べる演算子で、結果は`boolean`です。プロパティ名は文字列で書く(クォートが要る)点に注意してください。

限界もあります。**プロパティ名に依存している**ので、型を変えて名前が変わると静かに壊れます。自分で型を設計できるなら、5-1-3の目印のほうが安全です。

## 5-2-4 型ガード関数

> **戻り値の型を`引数 is 型`と書くと、判定を関数に切り出せる**

Module 4で学んだとおり、繰り返す処理は関数にします。ところが型ガードだけは、素直に切り出すと動きません。

```ts
type Success = { data: string };
type Failure = { message: string };

const isSuccess = (r: Success | Failure): boolean => "data" in r;

const result: Success | Failure = { data: "OK" };
if (isSuccess(result)) {
  console.log(result.data);
  // エラー: Property 'data' does not exist ...
}
```

関数の中では絞り込めているのに、呼び出し側には伝わりません。`boolean`は「真か偽か」しか表さず、「だから型はこれだ」という情報を持てないためです。

戻り値の型を`引数 is 型`と書くと伝わります。

```ts
const isSuccess = (r: Success | Failure): r is Success =>
  "data" in r;

if (isSuccess(result)) {
  console.log(result.data); // OK
}
```

これは「`true`を返したなら、その引数はこの型だ」とコンパイラーに教える宣言です。この関数を**型ガード関数**と呼びます。

**注意**: 判定の中身が間違っていてもコンパイラーは信じてしまいます。中身の正しさは自分で担保する必要があります。

## もっと知りたい人へ

- [制御フロー分析と型ガードによる型の絞り込み](https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard) — 絞り込みの詳しい説明
- [型ガード関数](https://typescriptbook.jp/reference/functions/type-guard-functions) — `is`の詳しい説明

---

演習は [practice.md](practice.md) にあります。
