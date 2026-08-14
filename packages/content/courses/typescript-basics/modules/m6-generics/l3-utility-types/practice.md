# レッスン6-3 演習 — Utility Types

対象トピック: 6-3-1 〜 6-3-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
type User = {
  id: string;
  name: string;
  age: number;
  email: string;
};

type UserPatch = Partial<User>;
type UserSummary = Pick<User, "id" | "name">;
type NewUser = Omit<User, "id">;
type FrozenUser = Readonly<User>;

const patch: UserPatch = { name: "田中" };
const summary: UserSummary = { id: "U-001", name: "田中" };

console.log(patch, summary);
```

写経できたら、次の改造をしてみましょう。

1. 4つの型それぞれにカーソルを乗せ、展開された型を確認しましょう
2. `User`に`phone: string`を足して、4つの型がどう変わるか見ましょう
3. `Omit<User, "idd">` とタイポして、**エラーにならない**ことを確認しましょう

## 演習問題

### 問1(基本)

次の`Product`型から、更新用の型`ProductPatch`(全項目が省略可能)を作ってください。

```ts
type Product = { id: string; name: string; price: number };
```

### 問2(基本)

同じ`Product`型から、次の2つを作ってください。

- 一覧表示用の`ProductListItem`(`id`と`name`だけ)
- 新規登録用の`NewProduct`(`id`以外)

それぞれ`Pick`と`Omit`のどちらを使ったか、その理由も答えてください。

### 問3(応用)

注文状態(`"received"` / `"shipped"` / `"delivered"`)から表示名への対応表の型を`Record`で作り、実際の値も宣言してください。そのうえで、状態を1つ足すと何が起きるか確認してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
type Product = { id: string; name: string; price: number };

type ProductPatch = Partial<Product>;
// { id?: string; name?: string; price?: number }

const patch: ProductPatch = { price: 500 };
console.log(patch); // => { price: 500 }
```

`Partial`を通すと全プロパティに`?`が付きます。更新したい項目だけを渡せるようになります。

`Product`に項目を足せば`ProductPatch`にも自動で反映されるので、二重管理になりません。

</details>

<details>
<summary>問2の解答例</summary>

```ts
type ProductListItem = Pick<Product, "id" | "name">;
// { id: string; name: string }

type NewProduct = Omit<Product, "id">;
// { name: string; price: number }
```

**`ProductListItem`は`Pick`** です。残す項目(2つ)のほうが少ないためです。

**`NewProduct`は`Omit`** です。除く項目(1つ)のほうが少なく、`Product`に項目を足したときも自動で追従するためです。`Pick`で書くと`"name" | "price"`と並べることになり、項目が増えるたびに書き足しが必要になります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
type OrderStatus = "received" | "shipped" | "delivered";

type StatusLabels = Record<OrderStatus, string>;
// { received: string; shipped: string; delivered: string }

const labels: StatusLabels = {
  received: "受付済み",
  shipped: "発送済み",
  delivered: "配達完了",
};

console.log(labels.shipped); // => "発送済み"
```

`OrderStatus`に`"cancelled"`を足すと、`labels`でエラーになります。

```
Property 'cancelled' is missing in type ... but required in type 'StatusLabels'.
```

型を1か所直すだけで、対応表の書き漏れが実行前に検出されます。レッスン5-3の網羅性チェックと同じ効果が、`switch`を書かずに得られます。

</details>

## 確認クイズ

### Q1. `Partial<T>` は何をしますか?

- A. `T`のプロパティを1つだけ残す
- B. `T`の全プロパティを省略可能にする
- C. `T`を読み取り専用にする

<details>
<summary>答え</summary>

**B** — 全プロパティに`?`が付いた型になります。更新処理の引数によく使います。

</details>

### Q2. 「10項目のうち1つだけ除きたい」とき、向いているのはどちらですか?

- A. `Pick`
- B. `Omit`

<details>
<summary>答え</summary>

**B** — 除く項目のほうが少ないので`Omit`です。`Pick`だと9つ並べることになり、項目が増えるたびに書き足しが必要になります。

</details>

### Q3. `Omit<User, "idd">` のようにタイポするとどうなりますか?

- A. エラーになる
- B. エラーにならず、何も除かれない型ができる

<details>
<summary>答え</summary>

**B** — `Pick`と違ってタイポを検出しません。結果の型を必ず確認してください。

</details>

### Q4. `Record<Status, string>` が作るのはどんな型ですか?

- A. `Status`型の配列
- B. `Status`の各値をキーに持ち、値が`string`のオブジェクト型
- C. `Status`と`string`のユニオン型

<details>
<summary>答え</summary>

**B** — 対応表の型です。キーに書き漏れがあると実行前にエラーになります。

</details>
