# レッスン4-5 演習 — コールバック

対象トピック: 4-5-1 〜 4-5-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const prices = [3000, 8000, 1200, 12000];

const expensive = prices.filter((price) => price >= 5000);
const labels = expensive.map((price) => `${price}円`);

console.log(expensive); // => [8000, 12000]
console.log(labels); // => ["8000円", "12000円"]
console.log(prices); // => [3000, 8000, 1200, 12000]
```

写経できたら、次の改造をしてみましょう。

1. 2行を1つにつなげて、`prices.filter(...).map(...)` の形にしましょう
2. `filter`のコールバックを `(price) => price * 2` に変えて、どんなエラーが出るか読みましょう
3. `map`と`filter`の順序を入れ替えて、結果がどう変わるか確認しましょう

## 演習問題

### 問1(基本)

商品名の配列`["コーヒー", "紅茶", "緑茶"]`から、すべてを`【 】`で囲んだ新しい配列を作ってください。`map`を使ってください。

### 問2(基本)

金額の配列`[1200, 800, 1500, 400]`から、1000円以上のものだけを取り出してください。`filter`を使ってください。

### 問3(応用)

次の商品配列から、**在庫がある商品だけ**を取り出し、**「商品名: 価格円」の文字列の配列**に変換してください。つなげて書いてください。

```ts
type Product = { name: string; price: number; inStock: boolean };

const products: Product[] = [
  { name: "コーヒー", price: 480, inStock: true },
  { name: "紅茶", price: 500, inStock: false },
  { name: "緑茶", price: 450, inStock: true },
];
// 期待: ["コーヒー: 480円", "緑茶: 450円"]
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const names = ["コーヒー", "紅茶", "緑茶"];

const labels = names.map((name) => `【${name}】`);

console.log(labels); // => ["【コーヒー】", "【紅茶】", "【緑茶】"]
console.log(names); // => ["コーヒー", "紅茶", "緑茶"]
```

`map`は要素数を変えずに中身だけ変換します。元の配列は変わりません。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const prices = [1200, 800, 1500, 400];

const high = prices.filter((price) => price >= 1000);

console.log(high); // => [1200, 1500]
```

`filter`のコールバックは`boolean`を返します。`price >= 1000`は比較演算子なので、そのまま`true`か`false`になります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const labels = products
  .filter((product) => product.inStock)
  .map((product) => `${product.name}: ${product.price}円`);

console.log(labels); // => ["コーヒー: 480円", "緑茶: 450円"]
```

`filter`を先に置くのがポイントです。先に絞っておけば、`map`が処理する件数が減ります。

`filter`のコールバックは`product.inStock`をそのまま返しています。これは`boolean`型のプロパティなので、比較演算子を書く必要がありません(`product.inStock === true`と書いても動きますが冗長です)。

`map`のコールバックでは、テンプレートリテラルとドット記法を組み合わせて文字列を作っています。

</details>

## 確認クイズ

### Q1. `show("コーヒー", shout)` と `show("コーヒー", shout())` の違いはどれですか?

- A. 同じ意味
- B. 前者は関数そのもの、後者は呼び出した結果を渡している
- C. 後者は文法エラー

<details>
<summary>答え</summary>

**B** — かっこは「いま実行する」という合図です。関数そのものを渡すときはかっこを付けません。

</details>

### Q2. `map`のコールバックは何を返しますか?

- A. 変換後の値
- B. 残すかどうかの`boolean`
- C. 何も返さない

<details>
<summary>答え</summary>

**A** — 返した値が新しい配列の要素になります。`boolean`を返すのは`filter`です。

</details>

### Q3. `[1, 2, 3].filter((n) => n >= 2)` の結果はどれですか?

- A. `[1, 2, 3]`
- B. `[2, 3]`
- C. `[true, true]`

<details>
<summary>答え</summary>

**B** — `true`を返した要素だけが残ります。`boolean`の配列にはなりません。

</details>

### Q4. `map`と`filter`は元の配列を変えますか?

- A. 変える
- B. 変えない。新しい配列を返す

<details>
<summary>答え</summary>

**B** — どちらも新しい配列を返します。だからドットでつなげて書けます。

</details>
