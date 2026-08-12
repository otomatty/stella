# レッスン1-4 演習 — 文字列

対象トピック: 1-4-1 〜 1-4-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const customerName = "田中";
const itemName = "ブレンドコーヒー";
const price = 480;

const message = `${customerName}さん、${itemName}を${price}円で承りました`;
console.log(message);
// => "田中さん、ブレンドコーヒーを480円で承りました"
```

写経できたら、次の改造をしてみましょう。

1. バッククォートをダブルクォートに変えて、表示がどう変わるか確認しましょう
2. `console.log(price + 100);`と`console.log("" + price + 100);`の結果を見比べましょう
3. 数量を表す変数を追加し、合計金額もメッセージに含めてみましょう

## 演習問題

### 問1(基本)

次の3つの変数を宣言し、テンプレートリテラルで「注文番号A-1001のご注文(ブレンドコーヒー×2)を承りました」という文を組み立てて表示してください。

- 注文番号「A-1001」
- 商品名「ブレンドコーヒー」
- 数量 2

### 問2(基本)

次のコードは、意図した表示になりません。原因を説明し、直してください。

```ts
const shopName = "青山コーヒー店";
console.log("ようこそ${shopName}へ");
// 期待: "ようこそ青山コーヒー店へ"
```

### 問3(応用)

次のコードは、合計金額として`350`を表示したいのに`"300" + 50`の結果になってしまいます。エラーは出ません。何が起きているかを説明し、`350`が表示されるよう直してください。

```ts
const priceFromForm = "300";
const shipping = 50;
const total = priceFromForm + shipping;

console.log(total); // 期待: 350
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const orderId = "A-1001";
const itemName = "ブレンドコーヒー";
const quantity = 2;

const message = `注文番号${orderId}のご注文(${itemName}×${quantity})を承りました`;
console.log(message);
// => "注文番号A-1001のご注文(ブレンドコーヒー×2)を承りました"
```

バッククォートで囲み、埋め込みたい場所に`${変数名}`を書きます。数値の変数もそのまま埋め込めます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const shopName = "青山コーヒー店";
console.log(`ようこそ${shopName}へ`);
// => "ようこそ青山コーヒー店へ"
```

`${ }`が働くのはバッククォートで囲んだときだけです。ダブルクォートの中では、ただの文字として扱われます。エラーが出ないため、画面を見るまで気づけない「静かなバグ」です。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const priceFromForm = 300;
const shipping = 50;
const total = priceFromForm + shipping;

console.log(total); // => 350
```

`"300"`はクォートで囲まれているので`string`型です。そのため`+`が足し算ではなく連結として働き、`"30050"`になっていました。

根本的な直し方は、値を最初から数値として持つことです。フォームから文字列で受け取る場合は、数値に変換してから計算します(変換の方法は後のモジュールで扱います)。`total`に`number`の型注釈を付けておくと、この取り違えをコンパイラーが検出してくれます。

</details>

## 確認クイズ

### Q1. `${ }`による変数の埋め込みが働くのは、どのクォートで囲んだときですか?

- A. ダブルクォート `"`
- B. シングルクォート `'`
- C. バッククォート `` ` ``

<details>
<summary>答え</summary>

**C** — バッククォートで囲んだ文字列(テンプレートリテラル)でのみ働きます。他のクォートではただの文字として表示されます。

</details>

### Q2. `console.log("100" + 1);`の出力はどれですか?

- A. `101`
- B. `"1001"`
- C. エラーになる

<details>
<summary>答え</summary>

**B** — `"100"`は文字列なので、`+`は連結として働きます。エラーにならないのが厄介な点です。

</details>

### Q3. `const userName: string = 田中;`がエラーになる理由はどれですか?

- A. 日本語は変数に入れられないから
- B. クォートがないため、`田中`という名前の変数を探しに行くから
- C. `string`型の書き方が間違っているから

<details>
<summary>答え</summary>

**B** — 「Cannot find name '田中'.」というエラーになります。クォートの有無で、値なのか変数名なのかが決まります。

</details>

### Q4. 本研修で基本とするクォートはどれですか?

- A. ダブルクォート `"`
- B. シングルクォート `'`
- C. そのつど好きなものを選ぶ

<details>
<summary>答え</summary>

**A** — 後のモジュールで学ぶPrettier(自動整形ツール)の慣習に合わせています。変数を埋め込むときだけバッククォートを使います。

</details>
