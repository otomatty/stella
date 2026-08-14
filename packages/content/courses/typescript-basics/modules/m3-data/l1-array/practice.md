# レッスン3-1 演習 — 配列の基本

対象トピック: 3-1-1 〜 3-1-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const items: string[] = ["コーヒー", "紅茶", "緑茶"];

console.log(items[0]); // => "コーヒー"
console.log(items.length); // => 3
console.log(items[items.length - 1]); // => "緑茶"
```

写経できたら、次の改造をしてみましょう。

1. `items[3]` を表示して、何が出るか確認しましょう
2. `const name: string = items[3];` と書いて、**エラーにならない**ことを確認しましょう
3. 配列に `"ほうじ茶"` を足して、`length`と最後の要素がどう変わるか見てみましょう

## 演習問題

### 問1(基本)

次の3つの配列を、型注釈を付けて宣言し、それぞれ`console.log`で表示してください。

- 曜日名の配列(月・火・水)
- 金額の配列(480、500、450)
- 在庫があるかどうかの配列(true、false、true)

### 問2(基本)

次のコードはエラーになります。エラーメッセージを読んで、原因を説明し、直してください。

```ts
const prices: number[] = [480, "500", 450];
console.log(prices);
```

### 問3(応用)

配列`items`の**2番目**と**最後**の要素を表示してください。要素数が変わっても正しく動くように書いてください。

```ts
const items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶"];
// 期待: "紅茶" と "ほうじ茶"
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const days: string[] = ["月", "火", "水"];
const prices: number[] = [480, 500, 450];
const inStock: boolean[] = [true, false, true];

console.log(days); // => ["月", "火", "水"]
console.log(prices); // => [480, 500, 450]
console.log(inStock); // => [true, false, true]
```

型注釈は「要素の型 + `[]`」の形です。初期値があるので、実際には推論に任せて型注釈を省略しても構いません。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const prices: number[] = [480, 500, 450];
console.log(prices); // => [480, 500, 450]
```

`"500"`はクォートで囲まれているので文字列です。`number[]`は数値だけを並べる配列なので、「Type 'string' is not assignable to type 'number'.」というエラーになります。

クォートを外して数値にすれば解決します。数値と文字列が混ざる配列を作る方法はModule 5で扱います。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const items = ["コーヒー", "紅茶", "緑茶", "ほうじ茶"];

console.log(items[1]); // => "紅茶"
console.log(items[items.length - 1]); // => "ほうじ茶"
```

2番目の要素はインデックス`1`です(0から数えるため)。最後の要素は`length - 1`で求めます。

`items[3]`と直接書くと、要素が増減したときに壊れます。`length - 1`で書いておけば、要素数が変わっても正しく動きます。

</details>

## 確認クイズ

### Q1. `const items = ["a", "b", "c"];` のとき、`items[1]` は何ですか?

- A. `"a"`
- B. `"b"`
- C. `"c"`

<details>
<summary>答え</summary>

**B** — インデックスは0から始まるので、`items[0]`が`"a"`、`items[1]`が`"b"`です。

</details>

### Q2. 要素が5つある配列の、最後の要素のインデックスはいくつですか?

- A. 4
- B. 5
- C. 6

<details>
<summary>答え</summary>

**A** — `length`は5ですが、インデックスは0から数えるので最後は`length - 1 = 4`です。

</details>

### Q3. `const items = ["a", "b"];` のとき、`items[10]` を表示すると何が出ますか?

- A. エラーになる
- B. `undefined`
- C. `""`

<details>
<summary>答え</summary>

**B** — 範囲外でも実行時エラーにはならず`undefined`が返ります。しかも型は`string`のままなので、コンパイラーも止めてくれません。使う前に`length`で確かめる必要があります。

</details>

### Q4. `number[]` という型注釈の意味はどれですか?

- A. 数値が1つ入る変数
- B. 数値だけを並べた配列
- C. 配列の長さが number

<details>
<summary>答え</summary>

**B** — 「要素の型 + `[]`」で「その型の配列」を表します。

</details>
