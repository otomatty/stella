# レッスン3-2 演習 — 配列を使う

対象トピック: 3-2-1 〜 3-2-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const prices = [480, 500, 450];

prices.push(600);

let total = 0;
for (const price of prices) {
  total = total + price;
}

console.log(prices); // => [480, 500, 450, 600]
console.log(total); // => 2030
```

写経できたら、次の改造をしてみましょう。

1. `prices = [100];` という行を追加して、エラーメッセージを読みましょう
2. `let total = 0;` を`for`のブロックの中に移動して、どうなるか確認しましょう
3. 合計だけでなく、件数と平均も表示してみましょう

## 演習問題

### 問1(基本)

商品名の配列を作り、次の操作を順に行って、そのつど`console.log`で確認してください。

1. `["コーヒー", "紅茶"]` で作る
2. 2番目を `"ほうじ茶"` に書き換える
3. `"緑茶"` を末尾に追加する

### 問2(基本)

金額の配列`[1200, 800, 1500]`について、`for-of`を使って次の2つを表示してください。

- 1件ずつ「〜円」の形で表示する(テンプレートリテラルを使う)
- 合計金額

### 問3(応用)

次のコードは、5000円以上の金額だけを合計したいものです。`for-of`と条件分岐を組み合わせて完成させてください。

```ts
const prices = [3000, 8000, 1200, 12000];
// 期待: 20000
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const items = ["コーヒー", "紅茶"];
console.log(items); // => ["コーヒー", "紅茶"]

items[1] = "ほうじ茶";
console.log(items); // => ["コーヒー", "ほうじ茶"]

items.push("緑茶");
console.log(items); // => ["コーヒー", "ほうじ茶", "緑茶"]
```

書き換えはインデックスへの代入、追加は`push`です。`const`で宣言していても、どちらも実行できます。禁止されているのは`items = [...]`という変数そのものへの再代入だけです。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const prices = [1200, 800, 1500];

let total = 0;
for (const price of prices) {
  console.log(`${price}円`);
  total = total + price;
}

console.log(`合計: ${total}円`);
// => "1200円"
// => "800円"
// => "1500円"
// => "合計: 3500円"
```

1回のループの中で、表示と集計を両方行えます。`total`はループの外で宣言する点に注意してください。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const prices = [3000, 8000, 1200, 12000];

let total = 0;
for (const price of prices) {
  if (price >= 5000) {
    total = total + price;
  }
}

console.log(total); // => 20000
```

`for-of`のブロックの中に`if`を書きます。条件に当たったときだけ足し込むので、8000と12000だけが合計されます。

ブロックが二重になりますが、内側の`if`から外側の`total`は見えます(レッスン2-1の「内側からは外が見える」)。

</details>

## 確認クイズ

### Q1. `const items = ["a"];` のとき、エラーになるのはどれですか?

- A. `items.push("b");`
- B. `items[0] = "c";`
- C. `items = ["d"];`

<details>
<summary>答え</summary>

**C** — `const`が禁じるのは変数への再代入だけです。中身の書き換えや追加はできます。

</details>

### Q2. `for (const item of items)` の`item`には何が入りますか?

- A. 要素のインデックス
- B. 取り出された要素そのもの
- C. 配列全体

<details>
<summary>答え</summary>

**B** — `of`の右の配列から、要素が1つずつ取り出されて入ります。インデックスは入りません。

</details>

### Q3. 集計用の変数を`for`のブロックの中で宣言するとどうなりますか?

- A. 正しく集計される
- B. 毎回リセットされ、ループの外からも見えない
- C. エラーになって実行できない

<details>
<summary>答え</summary>

**B** — 1回ごとに作り直されるうえ、スコープがブロックの中だけなので外から参照するとエラーになります。集計用の変数はループの外に置きます。

</details>
