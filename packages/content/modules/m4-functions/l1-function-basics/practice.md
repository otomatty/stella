# レッスン4-1 演習 — 関数の基本

対象トピック: 4-1-1 〜 4-1-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
function calcTotal(price: number): number {
  const tax = price * 0.1;
  return price + tax;
}

console.log(calcTotal(1000)); // => 1100
console.log(calcTotal(480)); // => 528
```

写経できたら、次の改造をしてみましょう。

1. `calcTotal("1000")` と呼び出して、エラーメッセージを読みましょう
2. `calcTotal()` と呼び出して、個数のエラーメッセージを読みましょう
3. `price: number` の型注釈を消して、どんなエラーが出るか確認しましょう

## 演習問題

### 問1(基本)

商品名と価格を受け取り、「コーヒーは480円です」の形の文字列を返す関数`describe`を書いてください。テンプレートリテラルを使ってください。

### 問2(基本)

在庫数を受け取り、次の文字列を返す関数`getStockLabel`を書いてください。早期リターンを使って`else`を書かずに実装してください。

- 0 なら「在庫切れ」
- 1〜4 なら「残りわずか」
- 5以上なら「在庫あり」

### 問3(応用)

次の関数はエラーになります。3か所の間違いを見つけて直してください。

```ts
function calcDiscount(price, rate: number): number {
  const discounted = price * (1 - rate);
  console.log(discounted);
}

console.log(calcDiscount(1000));
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
function describe(name: string, price: number): string {
  return `${name}は${price}円です`;
}

console.log(describe("コーヒー", 480));
// => "コーヒーは480円です"
```

引数が2つなのでカンマで区切ります。それぞれに型注釈が必要です。戻り値は文字列なので`: string`と書きます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
function getStockLabel(stock: number): string {
  if (stock === 0) {
    return "在庫切れ";
  }
  if (stock < 5) {
    return "残りわずか";
  }
  return "在庫あり";
}

console.log(getStockLabel(0)); // => "在庫切れ"
console.log(getStockLabel(3)); // => "残りわずか"
console.log(getStockLabel(10)); // => "在庫あり"
```

`return`には「終える」働きがあるので、条件に当たった時点で関数を抜けます。そのため`else`が要りません。

`if / else if / else`で書いても同じ結果になりますが、早期リターンのほうがネストが浅く読みやすくなります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
function calcDiscount(price: number, rate: number): number {
  const discounted = price * (1 - rate);
  return discounted;
}

console.log(calcDiscount(1000, 0.2)); // => 800
```

間違いは3つです。

1. `price`に型注釈がない → 「Parameter 'price' implicitly has an 'any' type.」
2. `return`がない → 戻り値の型を`number`と宣言しているのに何も返していない
3. 呼び出しで引数が1つしかない → 「Expected 2 arguments, but got 1.」

`console.log`は画面に表示するだけで、値を返しません。呼び出し元に結果を渡すには`return`が必要です。

</details>

## 確認クイズ

### Q1. 引数に型注釈を書かないとどうなりますか?

- A. 型推論で自動的に決まる
- B. 「implicitly has an 'any' type」というエラーになる
- C. 文字列型になる

<details>
<summary>答え</summary>

**B** — 引数には初期値がないため推論できません。だから必ず書きます。

</details>

### Q2. `return`の働きとして正しいものはどれですか?

- A. 値を返すだけ
- B. 処理を終えるだけ
- C. 値を返し、同時に処理を終える

<details>
<summary>答え</summary>

**C** — 2つの働きがあります。「終える」性質を利用したのが早期リターンです。

</details>

### Q3. 引数を1つ取る関数を、引数なしで呼び出すとどうなりますか?

- A. 引数が`undefined`になって実行される
- B. 「Expected 1 arguments, but got 0.」というエラーになる
- C. 何も起きない

<details>
<summary>答え</summary>

**B** — TypeScriptは個数もチェックします。JavaScriptでは`undefined`になって動いてしまいます。

</details>

### Q4. `console.log(値)` と `return 値` の違いはどれですか?

- A. どちらも呼び出し元に値を渡す
- B. `console.log`は画面に表示するだけで、呼び出し元は値を受け取れない
- C. `return`は画面に表示する

<details>
<summary>答え</summary>

**B** — 表示と「返す」はまったく別の操作です。次の計算に使いたいなら`return`が必要です。

</details>
