# レッスン4-3 演習 — 引数を使いこなす

対象トピック: 4-3-1 〜 4-3-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const calcTax = (price: number, rate = 0.1): number => {
  return price * rate;
};

const sum = (...prices: number[]): number => {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  return total;
};

console.log(calcTax(1000)); // => 100
console.log(calcTax(1000, 0.08)); // => 80
console.log(sum(480, 500, 450)); // => 1430
```

写経できたら、次の改造をしてみましょう。

1. `const prices = [100, 200];` を作り、`sum(prices)` と `sum(...prices)` の違いを確認しましょう
2. `rate` を `rate?: number` に変えて、関数の中でどんなエラーが出るか読みましょう
3. `sum` の引数を `(...prices: number[], label: string)` に変えて、エラーメッセージを読みましょう

## 演習問題

### 問1(基本)

商品名と、任意の割引率を受け取る関数`getPriceLabel`を書いてください。割引率が省略されたときは0(割引なし)として扱ってください。デフォルト引数を使ってください。

### 問2(基本)

いくつでも文字列を受け取り、読点でつないで返す関数`joinNames`を書いてください。残余引数と`for-of`を使ってください。

```ts
console.log(joinNames("田中", "佐藤", "鈴木"));
// 期待: "田中、佐藤、鈴木"
```

### 問3(応用)

次のコードはエラーになります。原因を説明し、**関数側は変えずに**呼び出し側だけを直してください。

```ts
const sum = (...prices: number[]): number => {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  return total;
};

const prices = [480, 500, 450];
console.log(sum(prices));
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const getPriceLabel = (price: number, discount = 0): string => {
  const final = price * (1 - discount);
  return `${final}円`;
};

console.log(getPriceLabel(1000)); // => "1000円"
console.log(getPriceLabel(1000, 0.2)); // => "800円"
```

既定値`0`から`number`と推論されるため、型注釈は省略できます。デフォルト引数なら`undefined`にならないので、関数の中で絞り込みが不要です。

オプション引数(`discount?: number`)で書くと、使う前に毎回`undefined`の確認が必要になります。既定値を入れたいだけならデフォルト引数のほうが素直です。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const joinNames = (...names: string[]): string => {
  let result = "";
  for (const name of names) {
    if (result === "") {
      result = name;
    } else {
      result = `${result}、${name}`;
    }
  }
  return result;
};

console.log(joinNames("田中", "佐藤", "鈴木"));
// => "田中、佐藤、鈴木"
```

残余引数の型注釈は配列の型(`string[]`)で書きます。関数の中では普通の配列なので`for-of`がそのまま使えます。

1件目だけ読点を付けない分岐が必要です。`result`は再代入するので`let`です。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const prices = [480, 500, 450];
console.log(sum(...prices)); // => 1430
```

`sum(prices)`と書くと、配列そのものが1つ目の引数として渡されます。`sum`は`number`を並べて受け取る関数なので、「Argument of type 'number[]' is not assignable to parameter of type 'number'.」というエラーになります。

呼び出し側でドット3つを付けると、配列が`480, 500, 450`と並べて書いたのと同じ形に展開されます。

同じ`...`でも、定義側なら「集める」、呼び出し側なら「広げる」です。

</details>

## 確認クイズ

### Q1. `(name: string, title?: string)` の`title`を渡さずに呼び出すと、`title`の値はどれですか?

- A. `""`
- B. `undefined`
- C. エラーになる

<details>
<summary>答え</summary>

**B** — オプション引数は渡されないと`undefined`になります。型は`string | undefined`なので、使う前に絞り込みが必要です。

</details>

### Q2. `(price: number, rate = 0.1)` の`rate`の型はどれですか?

- A. `number`
- B. `number | undefined`
- C. `0.1`

<details>
<summary>答え</summary>

**A** — 既定値があるので`undefined`にはならず、`number`と推論されます。だから絞り込みが不要です。

</details>

### Q3. `(...prices: number[])` の`prices`は関数の中で何として扱えますか?

- A. 数値1つ
- B. `number[]`の配列
- C. 文字列

<details>
<summary>答え</summary>

**B** — 普通の配列なので`for-of`も`length`もそのまま使えます。

</details>

### Q4. `sum(...prices)` の`...`はどちらの働きですか?

- A. 集める(残余引数)
- B. 広げる(スプレッド構文)

<details>
<summary>答え</summary>

**B** — 呼び出し側に書いてあるので「広げる」です。定義側(引数の位置)なら「集める」になります。

</details>
