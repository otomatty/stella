# レッスン3-2 配列を使う

## このレッスンの目標

- [ ] 要素を書き換え、`push`で追加できる
- [ ] `const`の配列で中身が変えられる理由を説明できる
- [ ] `for-of`で繰り返し、集計できる

## 3-2-1 要素の書き換えと追加

> **要素はインデックスで書き換え、`push`で末尾に追加する**

買い物カゴ、TODOリスト、検索結果の絞り込み。配列は増えたり変わったりするのが普通です。

```ts
const items = ["コーヒー", "紅茶"];

items[1] = "ほうじ茶"; // 書き換え
console.log(items); // => ["コーヒー", "ほうじ茶"]

items.push("緑茶"); // 末尾に追加
console.log(items); // => ["コーヒー", "ほうじ茶", "緑茶"]
```

書き換えは変数への代入と同じ形で、左辺が`items[1]`になるだけです。`push`は「押し込む」の意味で、ドットに続けて書き、かっこの中に足したい値を入れます。

型はここでも守ってくれます。

```ts
const prices: number[] = [480, 500];

prices.push("450");
// エラー: Argument of type 'string' is not
// assignable to parameter of type 'number'.
```

`argument`は「引数」、`parameter`は「受け取り側」です。用語はModule 4で正式に扱いますが、いまは「渡した型と受け取る型が合わない」と読めれば十分です。

## 3-2-2 constの配列でも中身は変えられる

> **`const`が禁じるのは変数への再代入だけ。配列の中身は変えられる**

`const`は再代入できないはずなのに、`push`は通ってしまいました。ここを曖昧にすると`const`の意味を取り違えます。

```ts
const items = ["コーヒー"];

items.push("紅茶"); // OK(中身を変えている)

items = ["緑茶"];
// エラー: Cannot assign to 'items' because it is a constant.
```

エラーメッセージは、レッスン1-1で見たものとまったく同じです。**変数名は配列への名札にすぎません。** `const`が固定するのは名札の貼り先であって、中身ではありません。

![変数名は配列への名札であり、constが固定するのは名札の貼り先だけであることを示す図](t2-const-array/assets/const-array.svg)

中身も変えたくない場合は`readonly`という指定があります。レッスン3-4で扱います。

## 3-2-3 for-ofで1つずつ取り出す

> **`for-of`は、配列の要素を先頭から1つずつ取り出して繰り返す**

`items[0]`、`items[1]`…と書いていては、要素が増えたら書き足すことになります。そもそも件数が分からない配列には手が出ません。

```
for (const 変数 of 配列) {
  1要素ごとに実行される
}
```

```ts
const items = ["コーヒー", "紅茶", "緑茶"];

for (const item of items) {
  console.log(item);
}
// => "コーヒー"
// => "紅茶"
// => "緑茶"
```

`of`の左が「取り出した1つを入れる変数」、右が「取り出す元の配列」です。この変数は毎回新しく作られるので`const`で構いません。

変数名は単数形(`item`)、配列名は複数形(`items`)にすると読みやすくなります。中かっこはレッスン2-1で学んだブロックなので、`item`のスコープはこの中だけです。

**要素が10個でも100個でも、コードは同じです。**

![配列から要素を1つずつ取り出してブロックを実行する流れ図](t3-for-of/assets/for-of-flow.svg)

## 3-2-4 繰り返しで集計する

> **集計は、ループの外に置いた`let`の変数に足し込んでいく**

合計金額、件数、平均。業務システムは集計だらけです。ここでレッスン2-1のスコープの知識が効いてきます。

```ts
const prices = [480, 500, 450];

let total = 0; // ループの外で用意する

for (const price of prices) {
  total = total + price;
}

console.log(total); // => 1430
```

`total`は再代入するので`let`です。レッスン1-1の「再代入が必要なときだけ`let`」に当てはまる、数少ない場面のひとつです。

置き場所を間違えると動きません。

```ts
for (const price of prices) {
  let total = 0; // 毎回0に戻る
  total = total + price;
}

console.log(total);
// エラー: Cannot find name 'total'.
```

ブロックの中で宣言すると、1回ごとに作り直されるうえ、ループの外からは見えません。エラーメッセージはレッスン2-1で見たものと同じです。

## もっと知りたい人へ

- [for-of文](https://typescriptbook.jp/reference/statements/for-of) — for-ofの詳しい説明
- [変数のスコープ](https://typescriptbook.jp/reference/statements/scope) — 集計変数の置き場所の考え方

---

演習は [practice.md](practice.md) にあります。
