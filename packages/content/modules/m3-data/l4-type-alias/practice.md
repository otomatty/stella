# レッスン3-4 演習 — 型エイリアス

対象トピック: 3-4-1 〜 3-4-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
type Product = {
  readonly id: string;
  name: string;
  price: number;
  note?: string;
};

const products: Product[] = [
  { id: "P-001", name: "コーヒー", price: 480 },
  { id: "P-002", name: "紅茶", price: 500, note: "期間限定" },
];

for (const product of products) {
  console.log(`${product.name}: ${product.price}円`);
}
```

写経できたら、次の改造をしてみましょう。

1. `products[0].id = "P-999";` と書いて、エラーメッセージを読みましょう
2. `console.log(products[0].note);` を実行して、何が表示されるか確認しましょう
3. `note`を`?`なしにして、1件目がエラーになることを確認しましょう

## 演習問題

### 問1(基本)

社員を表す型`Employee`を作ってください。プロパティは次のとおりです。

- `id`(文字列、**書き換え不可**)
- `name`(文字列)
- `department`(文字列、**省略可能**)

作ったら、`department`のある社員とない社員を1人ずつ宣言してください。

### 問2(基本)

問1の`Employee`型を使って、社員3人の配列を作ってください。`for-of`で全員の名前を表示してください。

### 問3(応用)

問2の配列について、部署名を表示してください。ただし`department`が省略されている社員は「所属なし」と表示してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
type Employee = {
  readonly id: string;
  name: string;
  department?: string;
};

const a: Employee = { id: "E-001", name: "田中", department: "営業部" };
const b: Employee = { id: "E-002", name: "佐藤" };

console.log(a); // => { id: "E-001", name: "田中", department: "営業部" }
console.log(b); // => { id: "E-002", name: "佐藤" }
```

`readonly`はプロパティ名の**前**、`?`は名前の**後ろ**です。位置が逆なので混同しないよう注意してください。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const employees: Employee[] = [
  { id: "E-001", name: "田中", department: "営業部" },
  { id: "E-002", name: "佐藤" },
  { id: "E-003", name: "鈴木", department: "開発部" },
];

for (const employee of employees) {
  console.log(employee.name);
}
// => "田中"
// => "佐藤"
// => "鈴木"
```

`Employee[]`で「`Employee`型の配列」を表します。外側の角かっこが配列、内側の中かっこが1件ぶんのデータです。

</details>

<details>
<summary>問3の解答例</summary>

```ts
for (const employee of employees) {
  const department = employee.department ?? "所属なし";
  console.log(`${employee.name}: ${department}`);
}
// => "田中: 営業部"
// => "佐藤: 所属なし"
// => "鈴木: 開発部"
```

`department`はオプショナルなので、読み出したときの型は`string | undefined`です。そのまま表示すると`undefined`と出てしまいます。

レッスン2-3で学んだ`??`を使うと、値がないときだけ既定値に置き換えられます。`if`で書いても同じ結果になります。

```ts
if (employee.department !== undefined) {
  console.log(`${employee.name}: ${employee.department}`);
} else {
  console.log(`${employee.name}: 所属なし`);
}
```

</details>

## 確認クイズ

### Q1. 型エイリアスを定義するキーワードはどれですか?

- A. `type`
- B. `const`
- C. `alias`

<details>
<summary>答え</summary>

**A** — `type 型の名前 = 型;` の形で書きます。型名は大文字始まりにするのが慣習です。

</details>

### Q2. `phone?: string` と書いたプロパティを読み出したときの型はどれですか?

- A. `string`
- B. `string | undefined`
- C. `undefined`

<details>
<summary>答え</summary>

**B** — 省略できるということは、ないかもしれないということです。使う前に絞り込むか`??`で既定値を用意します。

</details>

### Q3. `readonly id: string;` と書いたプロパティに対してできることはどれですか?

- A. オブジェクトを作るときに値を入れる
- B. 作ったあとに書き換える
- C. 省略する

<details>
<summary>答え</summary>

**A** — 作るときには値が必要で、作ったあとは書き換えられません。省略したい場合は`?`を使います。

</details>

### Q4. `Product[]` という型が表すものはどれですか?

- A. `Product`型のプロパティ
- B. `Product`型の値を並べた配列
- C. 配列を持つ`Product`型

<details>
<summary>答え</summary>

**B** — 「要素の型 + `[]`」のルールは、型エイリアスにもそのまま使えます。

</details>
