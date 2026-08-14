# レッスン3-3 演習 — オブジェクト

対象トピック: 3-3-1 〜 3-3-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const product: { name: string; price: number } = {
  name: "ブレンドコーヒー",
  price: 480,
};

console.log(product.name); // => "ブレンドコーヒー"
console.log(`${product.name}は${product.price}円です`);

product.price = 500;
console.log(product.price); // => 500
```

写経できたら、次の改造をしてみましょう。

1. `console.log(product.nema);` と書いて、エラーメッセージを読みましょう
2. 型注釈を消して、`product`にマウスカーソルを乗せ、推論された型を確認しましょう
3. `price` を型注釈から消して、値の側は残したままにするとどうなるか確認しましょう

## 演習問題

### 問1(基本)

次の情報を持つオブジェクト`task`を、型注釈を付けて作ってください。作ったら、テンプレートリテラルで「タイトル(状態)」の形に整えて表示してください。

- タイトル(文字列)「請求書を作成する」
- 完了したか(真偽値)`false`

### 問2(基本)

次のコードはエラーになります。エラーメッセージを読んで、原因を説明し、直してください。

```ts
const member: { name: string; age: number } = {
  name: "佐藤",
};
console.log(member);
```

### 問3(応用)

次のコードには間違いが2か所あります。エラーメッセージを手がかりに見つけて直してください。

```ts
const order: { id: string; total: number } = {
  id: 1001,
  totl: 3500,
};

console.log(order.id);
console.log(order.total);
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const task: { title: string; isDone: boolean } = {
  title: "請求書を作成する",
  isDone: false,
};

const status = task.isDone ? "完了" : "未完了";
console.log(`${task.title}(${status})`);
// => "請求書を作成する(未完了)"
```

真偽値のプロパティ名は`is`で始めると読みやすくなります(レッスン1-3)。表示用の文字列を作るところは、レッスン2-2の三項演算子が使えます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const member: { name: string; age: number } = {
  name: "佐藤",
  age: 34,
};
console.log(member); // => { name: "佐藤", age: 34 }
```

型注釈が`age`を必須としているのに、値の側に書かれていないためエラーになります。

「Property 'age' is missing ... but required in ...」というメッセージが、足りないプロパティ名をそのまま教えてくれています。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const order: { id: string; total: number } = {
  id: "1001",
  total: 3500,
};

console.log(order.id); // => "1001"
console.log(order.total); // => 3500
```

1つ目は`id`の型です。`string`と宣言しているのに数値の`1001`を入れていました。クォートで囲んで文字列にします。

2つ目はプロパティ名のタイポです。`totl`ではなく`total`が正しく、このままだと`total`が不足し、かつ`totl`という余分なプロパティがあることになります。

どちらも実行前に検出できています。JavaScriptなら`order.total`が`undefined`になり、画面を見るまで気づけませんでした。

</details>

## 確認クイズ

### Q1. オブジェクトのプロパティを読み取る書き方はどれですか?

- A. `user[0]`
- B. `user.name`
- C. `user(name)`

<details>
<summary>答え</summary>

**B** — オブジェクトは「ドットと名前」で読み書きします。「角かっこと番号」は配列です。

</details>

### Q2. 同じ種類の値をたくさん並べたいとき、向いているのはどちらですか?

- A. 配列
- B. オブジェクト

<details>
<summary>答え</summary>

**A** — 同じ種類の値の並びは配列、違う種類をひとまとまりにするのがオブジェクトです。

</details>

### Q3. `const user: { name: string; age: number }` の型注釈で、必須のプロパティはいくつですか?

- A. 0個
- B. 1個
- C. 2個

<details>
<summary>答え</summary>

**C** — `name`と`age`の両方が必須です。片方でも欠けるとエラーになります(省略可能にする書き方はレッスン3-4で学びます)。

</details>

### Q4. `const user = { name: "田中" };` としたあと、`user.name = "佐藤";` はどうなりますか?

- A. `const`なのでエラーになる
- B. 書き換えられる
- C. 新しいオブジェクトが作られる

<details>
<summary>答え</summary>

**B** — `const`が禁じるのは変数への再代入だけです。プロパティの書き換えはできます。

</details>
