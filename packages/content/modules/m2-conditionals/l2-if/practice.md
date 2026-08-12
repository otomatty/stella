# レッスン2-2 演習 — 条件分岐

対象トピック: 2-2-1 〜 2-2-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const stock = 3;

if (stock === 0) {
  console.log("在庫切れです");
} else if (stock < 5) {
  console.log("残りわずかです");
} else {
  console.log("在庫あり");
}
// => "残りわずかです"
```

写経できたら、次の改造をしてみましょう。

1. `stock`を`0`、`10`に変えて、3つの道をすべて通してみましょう
2. `if (stock === 0)` を `if (stock = 0)` に書き換えて、どんなエラーが出るか読みましょう
3. 同じ判定を三項演算子で書き直せるか考えてみましょう(2択に絞れば書けます)

## 演習問題

### 問1(基本)

会員ポイント`point`の値によって、次のように表示するコードを書いてください。

- 500以上 → 「ゴールド会員」
- 100以上500未満 → 「シルバー会員」
- 100未満 → 「一般会員」

### 問2(基本)

「支払い済みかどうか」を表す`isPaid`(boolean)から、表示用の文字列`label`を作ってください。支払い済みなら「支払い済み」、そうでなければ「未払い」とします。**`const`のまま**書いてください。

### 問3(応用)

次のコードは、300点の人に「シルバー会員」と表示したいのに「一般会員」と表示されます。原因を説明し、直してください。

```ts
const point = 300;

if (point < 100) {
  console.log("一般会員");
} else if (point < 1000) {
  console.log("一般会員");
} else if (point >= 100) {
  console.log("シルバー会員");
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const point = 250;

if (point >= 500) {
  console.log("ゴールド会員");
} else if (point >= 100) {
  console.log("シルバー会員");
} else {
  console.log("一般会員");
}
// => "シルバー会員"
```

範囲で分岐するときは、狭い(厳しい)条件から順に書きます。逆順にすると、広い条件が先に当たってしまい、後ろの分岐に届きません。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const isPaid = true;

const label = isPaid ? "支払い済み" : "未払い";
console.log(label); // => "支払い済み"
```

「値を選ぶ」だけなので三項演算子が向いています。`if`で書くと`let label;`と宣言してから代入することになり、`const`が使えなくなります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const point = 300;

if (point >= 1000) {
  console.log("ゴールド会員");
} else if (point >= 100) {
  console.log("シルバー会員");
} else {
  console.log("一般会員");
}
// => "シルバー会員"
```

元のコードは2つ目の条件`point < 1000`に300が当たってしまい、そこで確定していました。最初に当たった1つだけが実行されるため、3つ目の分岐には永遠に届きません。

範囲の分岐は、大きいほうから順に`>=`で書くと考えやすくなります。

</details>

## 確認クイズ

### Q1. `console.log(5 === 5);` の出力はどれですか?

- A. `5`
- B. `true`
- C. エラーになる

<details>
<summary>答え</summary>

**B** — 比較演算子の結果は`boolean`です。

</details>

### Q2. `if` / `else if` を重ねたとき、実行されるのはいくつですか?

- A. 条件に当たったものすべて
- B. 最初に当たった1つだけ
- C. 最後に当たった1つだけ

<details>
<summary>答え</summary>

**B** — 上から順に判定し、当たった時点で残りは見ません。だから条件の順序が結果を変えます。

</details>

### Q3. `const price = isMember ? 400 : 500;` のとき、`isMember`が`false`なら`price`はいくつですか?

- A. 400
- B. 500
- C. `undefined`

<details>
<summary>答え</summary>

**B** — コロンの右が`false`のときの値です。「isMemberなら400、そうでなければ500」と読みます。

</details>

### Q4. 「値を選んで変数に入れたい」場面に向いているのはどれですか?

- A. `if` 文
- B. 三項演算子
- C. どちらも同じ

<details>
<summary>答え</summary>

**B** — 三項演算子なら`const`のまま書けます。処理そのものを分けたい場合は`if`を使います。

</details>
