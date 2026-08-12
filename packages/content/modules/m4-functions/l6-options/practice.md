# レッスン4-6 演習 — 分割代入とOptions Object

対象トピック: 4-6-1 〜 4-6-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
type InvoiceOptions = {
  customer: string;
  amount: number;
  taxRate?: number;
  note?: string;
};

const makeInvoice = ({
  customer,
  amount,
  taxRate = 0.1,
  note = "なし",
}: InvoiceOptions): string => {
  const total = Math.round(amount * (1 + taxRate));
  return `${customer}様 / ${total}円 / 備考: ${note}`;
};

console.log(makeInvoice({ customer: "田中", amount: 10000 }));
// => "田中様 / 11000円 / 備考: なし"
```

写経できたら、次の改造をしてみましょう。

1. `taxRate: 0.08` を渡して、金額が変わることを確認しましょう
2. `amount` を渡さずに呼び出して、エラーメッセージを読みましょう
3. `customer` を分割代入から消して、関数の中でどんなエラーが出るか確認しましょう

## 演習問題

### 問1(基本)

次のオブジェクトから、分割代入で`name`と`price`を取り出して表示してください。

```ts
const product = { id: "P-001", name: "コーヒー", price: 480 };
```

### 問2(基本)

`Product`型のオブジェクトを1つ受け取り、「コーヒー(480円)」の形の文字列を返す関数`label`を、**分割代入引数**で書いてください。

```ts
type Product = { name: string; price: number };
```

### 問3(応用)

次の関数は引数が4つあり、呼び出し側を見ても意味が分かりません。Options Objectパターンに書き換えてください。`limit`は既定値10、`ascending`は既定値`true`としてください。

```ts
const search = (
  keyword: string,
  limit: number,
  ascending: boolean,
  saleOnly: boolean
): string => {
  return `${keyword} / ${limit} / ${ascending} / ${saleOnly}`;
};

console.log(search("コーヒー", 20, false, true));
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const product = { id: "P-001", name: "コーヒー", price: 480 };

const { name, price } = product;

console.log(`${name}は${price}円です`);
// => "コーヒーは480円です"
```

必要なものだけ取り出せます。`id`は書かなくても構いません。順番も関係なく、名前で対応します。

</details>

<details>
<summary>問2の解答例</summary>

```ts
type Product = { name: string; price: number };

const label = ({ name, price }: Product): string => {
  return `${name}(${price}円)`;
};

console.log(label({ name: "コーヒー", price: 480 }));
// => "コーヒー(480円)"
```

引数の位置に中かっこを書き、そのうしろに型を付けます。型は個々の変数ではなく、**オブジェクト全体**に対して付ける点に注意してください。

</details>

<details>
<summary>問3の解答例</summary>

```ts
type SearchOptions = {
  keyword: string;
  limit?: number;
  ascending?: boolean;
  saleOnly?: boolean;
};

const search = ({
  keyword,
  limit = 10,
  ascending = true,
  saleOnly = false,
}: SearchOptions): string => {
  return `${keyword} / ${limit} / ${ascending} / ${saleOnly}`;
};

console.log(search({ keyword: "コーヒー", limit: 20, ascending: false, saleOnly: true }));
// => "コーヒー / 20 / false / true"
```

元のコードでは`search("コーヒー", 20, false, true)`の`false`と`true`がそれぞれ何を意味するのか、呼び出し側からは分かりませんでした。しかも型が同じなので、順番を入れ替えてもエラーになりません。

Options Objectにすると、名前付きで渡せるうえ、既定値のある項目は省略できます。

</details>

## 確認クイズ

### Q1. `const { name } = user;` は何をしていますか?

- A. `user`という名前のオブジェクトを作っている
- B. `user`の`name`プロパティを、`name`という変数に取り出している
- C. `user`に`name`を追加している

<details>
<summary>答え</summary>

**B** — 分割代入です。オブジェクトリテラルと形が似ていますが、役割は逆(作るのではなく取り出す)です。

</details>

### Q2. 分割代入引数の型注釈はどこに付けますか?

- A. 中かっこの中の変数それぞれに
- B. 中かっこ全体のうしろに、オブジェクトの型として
- C. 関数名のうしろに

<details>
<summary>答え</summary>

**B** — `({ name, age }: User)` のように、オブジェクト全体に対して付けます。

</details>

### Q3. Options Objectパターンに切り替える目安はどれですか?

- A. 引数が1つ以上
- B. 引数が3つを超えたとき、または同じ型の真偽値が並ぶとき
- C. 引数が10個を超えたとき

<details>
<summary>答え</summary>

**B** — 引数が1つか2つなら位置引数のほうが簡潔です。真偽値が2つ以上並ぶと取り違えても気づけないので、早めに切り替えます。

</details>

### Q4. Options Objectで省略可能な項目を作るには、何を組み合わせますか?

- A. オプショナルプロパティ`?` とデフォルト引数`=`
- B. 残余引数`...`
- C. `readonly`

<details>
<summary>答え</summary>

**A** — 型の側で`?`を付けて省略可能にし、分割代入の側で`= 値`と既定値を書きます。

</details>
