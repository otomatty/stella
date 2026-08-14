# レッスン1-3 演習 — 数値と真偽値

対象トピック: 1-3-1 〜 1-3-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const unitPrice = 480;
const quantity = 3;
const subtotal = unitPrice * quantity;
const isMember = true;

console.log(subtotal); // => 1440
console.log(0.1 + 0.2); // => 0.30000000000000004
console.log(isMember); // => true
```

写経できたら、次の改造をしてみましょう。

1. 消費税10%を加えた税込金額を計算して表示しましょう(小数が出たら`Math.round`で丸めます)
2. `const isMember = "true";`に書き換えて、型がどう変わるか確認しましょう
3. `console.log(0.1 + 0.2 === 0.3);`を追加して、結果を予想してから実行しましょう

## 演習問題

### 問1(基本)

コーヒー1杯480円を4杯注文したときの、次の3つを計算して表示してください。すべて型推論に任せて構いません。

- 小計(税抜)
- 消費税額(10%、`Math.round`で四捨五入)
- 合計(税込)

### 問2(基本)

次の3つの状態を`boolean`型の変数で表してください。変数名は`is`で始めてください。

- 支払いが完了している
- キャンセルされていない
- 会員である

### 問3(応用)

次のコードは、期待どおりに動きません。何が起きているかを説明し、期待どおりに動くよう直してください。

```ts
const price = 0.1;
const cost = 0.2;
const total = price + cost;

console.log(total === 0.3); // 期待: true
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const unitPrice = 480;
const quantity = 4;

const subtotal = unitPrice * quantity;
const tax = Math.round(subtotal * 0.1);
const total = subtotal + tax;

console.log(subtotal); // => 1920
console.log(tax); // => 192
console.log(total); // => 2112
```

税額の計算で小数が出る可能性があるため、`Math.round`で整数に丸めてから合計しています。金額を扱うときは、小数を長く持ち回らないのが基本です。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const isPaid = true;
const isCancelled = false;
const isMember = true;

console.log(isPaid); // => true
console.log(isCancelled); // => false
console.log(isMember); // => true
```

「キャンセルされていない」は、変数名を`isCancelled`にして値を`false`にします。`isNotCancelled = true`のように変数名を否定形にすると、「否定されていない」のような二重否定が生まれて読みにくくなるため避けます。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const price = 0.1;
const cost = 0.2;
const total = Math.round((price + cost) * 10) / 10;

console.log(total === 0.3); // => true
```

`0.1 + 0.2`は`0.30000000000000004`になるため、`=== 0.3`が`false`になります。コンピューターの小数の持ち方による誤差です。

いったん10倍して整数にしてから丸め、最後に10で割ることで期待どおりの値になります。実務ではそもそも小数で比較せず、金額なら「円」ではなく整数のまま計算する設計にします。

</details>

## 確認クイズ

### Q1. TypeScriptで`0.1`を入れる変数の型はどれですか?

- A. `float`
- B. `number`
- C. `double`

<details>
<summary>答え</summary>

**B** — TypeScriptは整数と小数を区別しません。数値はすべて`number`型です。

</details>

### Q2. `console.log(0.1 + 0.2);`の出力はどれですか?

- A. `0.3`
- B. `0.30000000000000004`
- C. エラーになる

<details>
<summary>答え</summary>

**B** — コンピューターの小数の持ち方の都合でわずかな誤差が出ます。金額の計算では整数で扱うなどの工夫をします。

</details>

### Q3. `boolean`型に入れられる値はどれですか?

- A. `true`と`false`の2つだけ
- B. `true`、`false`、`"true"`、`"false"`の4つ
- C. `0`と`1`

<details>
<summary>答え</summary>

**A** — クォート付きの`"true"`は文字列なので入れられません。

</details>

### Q4. 本研修で名前だけ知っていればよい、とされているプリミティブ型はどれですか?

- A. `number`と`string`
- B. `symbol`と`bigint`
- C. `undefined`と`null`

<details>
<summary>答え</summary>

**B** — `symbol`と`bigint`は実務で書く機会がほとんどありません。`undefined`と`null`はレッスン1-6で扱います。

</details>
