# レッスン1-2 演習 — 型注釈と型推論

対象トピック: 1-2-1 〜 1-2-5

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const productName: string = "ブレンドコーヒー";
const price: number = 480;
const isOnSale = true;

console.log(productName); // => "ブレンドコーヒー"
console.log(price); // => 480
console.log(isOnSale); // => true
```

写経できたら、次の改造をしてみましょう。

1. `isOnSale`にマウスカーソルを乗せて、推論された型を確認しましょう
2. `price = "無料";`という行を追加して、エラーメッセージの2つの型名を読み取りましょう
3. `let memo: string;`と宣言だけして、`console.log(memo);`を書くとどうなるか見てみましょう

## 演習問題

### 問1(基本)

次の4つの変数に、型注釈を**付けて**宣言してください。値は自由に決めて構いません。

- 商品名(文字列)
- 在庫数(数値)
- 割引率(数値)
- 販売中かどうか(真偽値)

### 問2(基本)

次のコードには型に関する間違いが1か所あります。エラーメッセージを手がかりに見つけて、**型注釈は変えずに**代入する値の側を直してください。

```ts
const userName: string = "高橋";
let loginCount: number = "3";
console.log(userName);
console.log(loginCount);
```

### 問3(応用)

次のコードは、本研修の方針に照らすと型注釈の書き方が適切ではありません。方針に沿って書き直してください。どの行をなぜ変えたかも説明してください。

```ts
const shopName: string = "青山コーヒー店";
const openHour: number = 9;
let currentVisitors: number = 0;
let lastOrderName: string;
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const productName: string = "ブレンドコーヒー";
const stockCount: number = 25;
const discountRate: number = 0.2;
const isOnSale: boolean = true;

console.log(productName); // => "ブレンドコーヒー"
console.log(stockCount); // => 25
console.log(discountRate); // => 0.2
console.log(isOnSale); // => true
```

型名はすべて小文字です。割引率の`0.2`のような小数も`number`型である点に注意してください(TypeScriptは整数と小数を区別しません。詳しくはレッスン1-3で扱います)。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const userName: string = "高橋";
let loginCount: number = 3;
console.log(userName); // => "高橋"
console.log(loginCount); // => 3
```

`"3"`はダブルクォートで囲まれているため文字列(string型)です。number型の変数には入れられず、「Type 'string' is not assignable to type 'number'.」というエラーになります。クォートを外して数値の`3`にすれば解決します。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const shopName = "青山コーヒー店";
const openHour = 9;
let currentVisitors = 0;
let lastOrderName: string; // 初期値がないので型注釈が必要
```

上の3行は初期値があるため、型推論に任せられます。同じ情報を2か所に書かずに済み、値を変えたときの書き換え漏れも防げます。

4行目だけは初期値がなく、コンパイラーが型を判別できないため、型注釈が必要です。「書くのは推論できないときだけ」という方針の、まさにその場面です。

</details>

## 確認クイズ

### Q1. `let price = 300;`と宣言したとき、`price`の型はどうなりますか?

- A. 型注釈がないので型は付かない
- B. どんな値でも入るようになる
- C. 型推論によりnumber型になる

<details>
<summary>答え</summary>

**C** — 初期値の`300`から、コンパイラーがnumber型だと自動で判別します。型注釈を省略してもチェックの厳しさは変わりません。

</details>

### Q2. 型注釈の構文として正しいものはどれですか?

- A. `const number: price = 300;`
- B. `const price: number = 300;`
- C. `const price = number: 300;`

<details>
<summary>答え</summary>

**B** — 変数名が先、コロンの右が型、イコールの右が値です。JavaやC言語とは語順が逆なので注意してください。

</details>

### Q3. 「Type 'string' is not assignable to type 'number'.」というエラーの意味はどれですか?

- A. number型の値を、string型の変数に入れようとした
- B. string型の値を、number型の変数に入れようとした
- C. 型注釈の書き方が間違っている

<details>
<summary>答え</summary>

**B** — 前に出てくる型が「入れようとした型」、後ろが「受け入れ側の型」です。この読み方を覚えると、ほとんどの型エラーが自力で直せます。

</details>

### Q4. 本研修で型注釈を書くのはどんなときですか?

- A. すべての変数に必ず書く
- B. 初期値がなく、型推論が働かないとき
- C. 型注釈は一切書かない

<details>
<summary>答え</summary>

**B** — 初期値がある変数は推論に任せます。初期値がない宣言など、推論できない場面だけ書きます。ただし配属先の規約があればそちらが優先です。

</details>
