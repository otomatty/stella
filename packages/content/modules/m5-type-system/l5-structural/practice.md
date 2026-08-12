# レッスン5-5 演習 — 交差型と構造的型付け

対象トピック: 5-5-1 〜 5-5-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
type Base = { id: string; createdAt: string };
type UserInfo = { name: string; age: number };

type User = Base & UserInfo;

const user: User = {
  id: "U-001",
  createdAt: "2026-08-09",
  name: "田中",
  age: 28,
};

console.log(user);
```

写経できたら、次の改造をしてみましょう。

1. `age` を消して、どんなエラーが出るか読みましょう
2. `email: "a@example.com"` を足して、余剰プロパティチェックのエラーを読みましょう
3. 同じ内容を一度変数に入れてから`User`型に代入すると通ることを確認しましょう

## 演習問題

### 問1(基本)

`Base`(`id`と`createdAt`)と`ProductInfo`(`name`と`price`)を交差型で合成した`Product`型を作り、値を1つ宣言してください。

### 問2(基本)

次の2つの型は名前が違いますが、片方をもう片方に代入できます。理由を説明してください。

```ts
type Point2D = { x: number; y: number };
type Coordinate = { x: number; y: number };
```

### 問3(応用)

次のコードは1つ目がエラーになり、2つ目は通ります。この違いが起きる理由を説明してください。また、この挙動があることで防げるバグは何かも答えてください。

```ts
type Config = { env: string };

const a: Config = { env: "prod", debug: true }; // エラー
const tmp = { env: "prod", debug: true };
const b: Config = tmp; // OK
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
type Base = { id: string; createdAt: string };
type ProductInfo = { name: string; price: number };

type Product = Base & ProductInfo;

const product: Product = {
  id: "P-001",
  createdAt: "2026-08-09",
  name: "コーヒー",
  price: 480,
};
```

`&`でつないだ両方のプロパティが必須になります。共通項目を`Base`にまとめておけば、`User`でも`Product`でも再利用できます。

</details>

<details>
<summary>問2の解答例</summary>

TypeScriptは**構造的型付け**を採用しているためです。型の名前ではなく、形(プロパティの名前と型)が合っているかで判定します。

`Point2D`と`Coordinate`はどちらも`x: number`と`y: number`を持つので、コンパイラーから見れば同じ型です。

JavaやC#のように名前で判定する言語(公称型)とは考え方が違うので、他言語の経験者ほど戸惑いやすいポイントです。

</details>

<details>
<summary>問3の解答例</summary>

1つ目は**余剰プロパティチェック**が働くためエラーになります。オブジェクトリテラルをその場で直接書いた場合だけ、型にないプロパティが弾かれます。

2つ目は変数を経由しているため、構造的型付けの「形が合っていればOK」が適用されます。`tmp`は`Config`が求める`env`を持っているので代入できます。

**防げるバグはタイポです。** たとえば`{ env: "prod", enviroment: "prod" }`のように書き間違えたとき、余剰プロパティチェックがなければ静かに無視されてしまいます。その場で書いたオブジェクトの余分なプロパティは書き間違いの可能性が高い、という判断でこの検査が入っています。

したがって「エラーが出たら変数に逃がす」という対処は、検査をすり抜ける行為なので避けてください。

</details>

## 確認クイズ

### Q1. `A & B` 型の値に求められるものはどれですか?

- A. AかBのどちらかを満たす
- B. AとBの両方を満たす
- C. AとBの共通部分だけを満たす

<details>
<summary>答え</summary>

**B** — 交差型は「かつ」です。プロパティは増える方向になります。

</details>

### Q2. TypeScriptは型が一致するかをどう判定しますか?

- A. 型の名前で判定する
- B. 形(プロパティの構成)で判定する

<details>
<summary>答え</summary>

**B** — 構造的型付けです。名前が違っても形が同じなら代入できます。

</details>

### Q3. 余剰プロパティチェックが働くのはどの場合ですか?

- A. いつでも
- B. オブジェクトリテラルを直接書いて渡すとき
- C. 変数を経由して渡すとき

<details>
<summary>答え</summary>

**B** — その場で書いたなら余分なプロパティはタイポの可能性が高い、という判断です。変数経由では働きません。

</details>
