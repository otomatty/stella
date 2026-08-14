# レッスン4-4 戻り値と関数の型

## このレッスンの目標

- [ ] `void`で「値を返さない」ことを表せる
- [ ] 戻り値の型注釈を書く理由を説明できる
- [ ] 関数そのものの型を書き、型エイリアスで名前を付けられる

## 4-4-1 void型

> **値を返さない関数の戻り値の型は`void`と書く**

画面に表示するだけ、記録するだけ、という関数があります。4-1-2で戻り値の型は書く方針にしたので、その場合の書き方が必要です。

`void`(ヴォイド)は「何もない」という意味の型です。

```ts
const logOrder = (name: string): void => {
  console.log(`注文: ${name}`);
};

logOrder("コーヒー"); // => "注文: コーヒー"
```

`return`は書きません(処理を途中で抜けたいときは、値なしの`return`だけ書けます)。`console.log`は表示するだけで値を返していない、という4-1-3の話が、ここで型として現れています。

![値を返す関数と返さない関数の対比図](t1-void/assets/void-vs-value.svg)

レッスン1-6の`undefined`とは別物です。`undefined`は「値がない」という値、`void`は「返す値が存在しない」ことを表す型です。

## 4-4-2 戻り値の型を書く理由

> **戻り値の型を書いておくと、実装ミスを関数の中で止められる**

レッスン1-2で「推論できるなら任せる」と決めました。戻り値の型は推論できるのに、なぜ書くのでしょうか。

変数の推論と決定的に違うのは、**間違いが呼び出し側まで運ばれる**点です。

```ts
const calcTax = (price: number) => {
  return `${price * 0.1}`; // 文字列を返してしまった
};

const tax: number = calcTax(1000);
// エラー: Type 'string' is not assignable to type 'number'.
```

関数の中は素通りして、呼び出し側でエラーになります。原因は関数の中にあるので、**エラーの出た場所と直す場所が離れます。** 呼び出し箇所が10か所あれば10か所で赤くなります。

型を書いておけば、その場で止まります。

```ts
const calcTax = (price: number): number => {
  return `${price * 0.1}`;
  // エラー: Type 'string' is not assignable to type 'number'.
};
```

戻り値の型は「この関数はこれを返す」という宣言であり、仕様書としても働きます。

## 4-4-3 関数の型

> **関数そのものの型は`(引数: 型) => 戻り値の型`と書く**

4-2-1で「関数は値である」と学びました。値なら型があります。数値なら`number`、文字列なら`string`。では関数の型は何でしょうか。

アロー関数の書き方から、中身だけ取り除いた形になります。

```ts
const calcTax: (price: number) => number = (price) => {
  return price * 0.1;
};

console.log(calcTax(1000)); // => 100
```

コロンの後ろが関数の型です。矢印の右が処理ではなく**戻り値の型**になる点だけが、アロー関数の定義と違います。

なお、右辺の実装側では引数の型注釈を省略できます(左の型から推論されるため)。

実は今まで書いてきた関数にも、この形の型が付いていました。

```ts
const calcTax = (price: number): number => price * 0.1;
// 推論: (price: number) => number
```

Playgroundで`calcTax`にカーソルを乗せると表示されます。新しい概念ではなく、見えていなかったものに名前が付いただけです。

## 4-4-4 関数の型に名前を付ける

> **関数の型も型エイリアスで名前を付けられる。名前が仕様書になる**

`(price: number) => number`を書く場所すべてに繰り返すのは、レッスン3-4でオブジェクトの型に感じたのとまったく同じ不満です。解決策も同じで、`type`で名前を付けます。

```ts
type PriceRule = (price: number) => number;

const calcTax: PriceRule = (price) => price * 0.1;
const calcDiscount: PriceRule = (price) => price * 0.8;

console.log(calcTax(1000)); // => 100
console.log(calcDiscount(1000)); // => 800
```

2つの関数が同じ形をしていることが、`PriceRule`という名前で表現されています。**型エイリアスはあらゆる型に付けられます。**

![型を先に決め、それに合う実装を書くという関係を示す図](t4-function-type-alias/assets/function-type-spec.svg)

型が「こういう関数を作れ」という指示になっており、実装が仕様から外れればその場でエラーになります。この考え方は次のレッスンのコールバックで本領を発揮します。

## もっと知りたい人へ

- [void型](https://typescriptbook.jp/reference/functions/void-type) — voidの詳しい説明
- [関数の型](https://typescriptbook.jp/reference/functions/function-type) — 関数型の詳しい説明

---

演習は [practice.md](practice.md) にあります。
