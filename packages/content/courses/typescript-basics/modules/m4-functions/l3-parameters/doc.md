# レッスン4-3 引数を使いこなす

## このレッスンの目標

- [ ] オプション引数とデフォルト引数を使い分けられる
- [ ] 残余引数で個数不定の引数を受け取れる
- [ ] `...`が置く場所で意味を変えることを説明できる

## 4-3-1 オプション引数

> **引数名のうしろに`?`を付けると、渡さずに呼び出せる**

4-1-4で見たとおり、引数の個数は厳密にチェックされます。しかし「クーポンコードは任意」のように、省略したい引数はあります。

レッスン3-4のオプショナルプロパティと同じ記号、同じ考え方です。

```ts
const greet = (name: string, title?: string): string => {
  return `${name}さん`;
};

console.log(greet("田中", "部長")); // OK
console.log(greet("田中")); // OK
```

渡されなければ`undefined`になるので、型は`string | undefined`です。使うときは絞り込みが要ります。

```ts
const greet = (name: string, title?: string): string => {
  if (title !== undefined) {
    return `${name} ${title}`;
  }
  return `${name}さん`;
};
```

レッスン2-3で学んだ`if`による絞り込みも`??`もそのまま使えます。

ルールが1つあります。**オプション引数は必ず最後に置きます。** 前に置くと、どれを省略したのか判別できなくなるためです。

## 4-3-2 デフォルト引数

> **引数に`= 値`を書いておくと、省略時にその値が使われる**

「消費税率は普通10%だが、たまに8%」のような既定値の場合、オプション引数だと使うたびに`undefined`を確認することになります。値がないことを扱いたいのではなく、既定値を入れたいだけなら、もっと素直な書き方があります。

```ts
const calcTax = (price: number, rate: number = 0.1): number => {
  return price * rate;
};

console.log(calcTax(1000)); // => 100
console.log(calcTax(1000, 0.08)); // => 80
```

省略されても`undefined`にならないので、`rate`の型は`number`です。関数の中で絞り込みなしにそのまま使えます。

型注釈は省略できます。

```ts
const calcTax = (price: number, rate = 0.1): number => {
  return price * rate;
};
```

既定値`0.1`から`number`と推論されます。4-1-2で「引数には必ず型注釈」と決めましたが、既定値があれば推論が効くので例外になります。レッスン1-2の「推論できるなら任せる」に立ち返れば一貫しています。

オプション引数と同じく、最後に置くのが原則です。

## 4-3-3 残余引数

> **引数の前に`...`を付けると、残りをすべて配列で受け取れる**

「渡された金額を全部合計する」関数は、引数が何個になるか分かりません。オプション引数を10個並べるわけにもいきません。

```ts
const sum = (...prices: number[]): number => {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  return total;
};

console.log(sum(480, 500, 450)); // => 1430
```

残余は「残り」の意味で、ドット3つを付けます。型注釈は配列の型で書きます。呼び出し側は角かっこを書かずに値を並べるだけです。

関数の中では`prices`が普通の`number[]`の配列なので、レッスン3-2の`for-of`がそのまま使えます。

**残余引数は最後に1つだけ**です。前に通常の引数を置くのは構いません。

```ts
const summarize = (label: string, ...prices: number[]): string => {
  return `${label}: ${prices.length}件`;
};

console.log(summarize("金額", 480, 500)); // => "金額: 2件"
```

残余引数の後ろには何も置けません(どこまでが残りか判別できないため)。

## 4-3-4 スプレッド構文

> **呼び出し側で`...`を付けると、配列を1つずつの引数に展開できる**

合計したい金額が、すでに配列に入っていることがあります。`sum(prices)`と渡すと配列そのものが1つ目の引数になってしまい、型が合いません。

```ts
const prices = [480, 500, 450];
console.log(sum(...prices)); // => 1430
```

ドット3つを付けると、`sum(480, 500, 450)`と書いたのと同じになります。この書き方を**スプレッド構文**と呼びます。スプレッドは「広げる」の意味です。

![残余引数は集め、スプレッド構文は広げるという対比図](t4-spread/assets/rest-vs-spread.svg)

同じ記号で正反対の働きをしますが、判断は簡単です。

- **定義側**(引数の位置)に書いてあれば → 集める(残余引数)
- **呼び出し側**に書いてあれば → 広げる(スプレッド構文)

どこに書いてあるかだけで決まります。

## もっと知りたい人へ

- [オプション引数](https://typescriptbook.jp/reference/functions/optional-parameters) — `?`の詳しい説明
- [デフォルト引数](https://typescriptbook.jp/reference/functions/default-parameters) — 既定値の詳しい説明
- [残余引数](https://typescriptbook.jp/reference/functions/rest-parameters) — `...`の詳しい説明

---

演習は [practice.md](practice.md) にあります。
