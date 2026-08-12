# レッスン4-4 演習 — 戻り値と関数の型

対象トピック: 4-4-1 〜 4-4-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
type PriceRule = (price: number) => number;

const calcTax: PriceRule = (price) => price * 0.1;

const logPrice = (price: number): void => {
  console.log(`${price}円`);
};

logPrice(calcTax(1000)); // => "100円"
```

写経できたら、次の改造をしてみましょう。

1. `const result = logPrice(100);` と書いて、`result`にカーソルを乗せ型を確認しましょう
2. `calcTax`の実装を `(price) => \`${price}\`` に変えて、どこでエラーが出るか確認しましょう
3. `PriceRule`型の関数をもう1つ作って、同じ型で書けることを確認しましょう

## 演習問題

### 問1(基本)

商品名を受け取って画面に表示するだけの関数`showProduct`を書いてください。戻り値の型注釈も付けてください。

### 問2(基本)

「文字列を受け取って文字列を返す」関数の型に`Formatter`という名前を付けてください。その型を使って、次の2つの関数を書いてください。

- 名前を`【 】`で囲む関数
- 名前の末尾に`様`を付ける関数

### 問3(応用)

次のコードでは、エラーが`calcDiscount`の中ではなく呼び出し側で出ます。なぜそうなるのかを説明し、関数の中でエラーが出るように直してください。

```ts
const calcDiscount = (price: number) => {
  return `${price * 0.8}`;
};

const discounted: number = calcDiscount(1000);
console.log(discounted);
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const showProduct = (name: string): void => {
  console.log(`商品: ${name}`);
};

showProduct("コーヒー"); // => "商品: コーヒー"
```

`console.log`は表示するだけで値を返しません。返す値が存在しないので、戻り値の型は`void`です。

</details>

<details>
<summary>問2の解答例</summary>

```ts
type Formatter = (name: string) => string;

const bracket: Formatter = (name) => `【${name}】`;
const honorific: Formatter = (name) => `${name}様`;

console.log(bracket("コーヒー")); // => "【コーヒー】"
console.log(honorific("田中")); // => "田中様"
```

型エイリアスで名前を付けると、同じ形の関数であることが一目で分かります。実装側では引数の型注釈を省略できます(`Formatter`から推論されるため)。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const calcDiscount = (price: number): number => {
  return price * 0.8;
  // 型注釈を付けたので、文字列を返すとここでエラーになる
};

const discounted: number = calcDiscount(1000);
console.log(discounted); // => 800
```

元のコードは戻り値の型注釈がないため、コンパイラーは`string`を返す関数だと推論します。関数の中では矛盾がないので通ってしまい、`number`型の変数に代入しようとした呼び出し側で初めてエラーになります。

戻り値の型を`: number`と書いておけば、`return`の時点で止まります。エラーの出た場所と直す場所が一致するので、原因がすぐ分かります。

</details>

## 確認クイズ

### Q1. 値を返さない関数の戻り値の型はどれですか?

- A. `undefined`
- B. `void`
- C. 書かない

<details>
<summary>答え</summary>

**B** — `void`は「返す値が存在しない」ことを表す型です。`undefined`は「値がない」という値そのもので、別物です。

</details>

### Q2. `(price: number) => number` という型が表すものはどれですか?

- A. 数値を返す変数
- B. 数値を1つ受け取って数値を返す関数
- C. 数値の配列

<details>
<summary>答え</summary>

**B** — 矢印の左が引数、右が戻り値の型です。アロー関数の定義から中身を取り除いた形になっています。

</details>

### Q3. 戻り値の型注釈を書いておく利点はどれですか?

- A. 実行速度が上がる
- B. 実装ミスを関数の中で止められる
- C. 引数の型を省略できる

<details>
<summary>答え</summary>

**B** — 書かないと、間違った型のまま呼び出し側まで運ばれ、エラーの出る場所と原因の場所が離れてしまいます。

</details>

### Q4. 関数の型に`type`で名前を付けられますか?

- A. 付けられる
- B. オブジェクトの型にしか付けられない
- C. 関数専用の別のキーワードが要る

<details>
<summary>答え</summary>

**A** — 型エイリアスはあらゆる型に付けられます。オブジェクトの型と同じ書き方です。

</details>
