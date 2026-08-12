# レッスン4-2 演習 — 関数の書き方3種

対象トピック: 4-2-1 〜 4-2-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
// 関数宣言
function calcTaxA(price: number): number {
  return price * 0.1;
}

// 関数式
const calcTaxB = function (price: number): number {
  return price * 0.1;
};

// アロー関数
const calcTaxC = (price: number): number => {
  return price * 0.1;
};

console.log(calcTaxA(1000), calcTaxB(1000), calcTaxC(1000));
// => 100 100 100
```

写経できたら、次の改造をしてみましょう。

1. `calcTaxC`を、中かっこと`return`を省いた1行の形に書き換えましょう
2. 3つの呼び出しを、定義より**前**の行に移動して、どれがエラーになるか確認しましょう
3. アロー関数の`: number`(戻り値の型)を消して、推論される型を確認しましょう

## 演習問題

### 問1(基本)

次の関数宣言を、アロー関数に書き換えてください。

```ts
function toUpperLabel(name: string): string {
  return `【${name}】`;
}
```

### 問2(基本)

問1のアロー関数を、中かっこと`return`を省いた1行の形にしてください。

### 問3(応用)

次のコードはエラーになります。エラーメッセージを読んで原因を説明し、**関数の書き方を変えずに**直してください。

```ts
console.log(calcArea(3, 4));

const calcArea = (width: number, height: number): number => {
  return width * height;
};
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const toUpperLabel = (name: string): string => {
  return `【${name}】`;
};

console.log(toUpperLabel("コーヒー")); // => "【コーヒー】"
```

`function 名前(...)` を `const 名前 = (...) =>` に置き換えるだけです。引数・型注釈・処理はそのまま使えます。末尾にセミコロンが必要になる点だけ注意してください。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const toUpperLabel = (name: string): string => `【${name}】`;

console.log(toUpperLabel("コーヒー")); // => "【コーヒー】"
```

処理が式1つだけなので、中かっこと`return`を省略できます。省略すると、その式の結果が自動で返ります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const calcArea = (width: number, height: number): number => {
  return width * height;
};

console.log(calcArea(3, 4)); // => 12
```

「Block-scoped variable 'calcArea' used before its declaration.」というエラーです。アロー関数は変数に代入する形なので、宣言より前の行では使えません。

呼び出しを定義の**後ろ**に移動すれば解決します。関数宣言(`function calcArea(...)`)に書き換えても動きますが、今回は書き方を変えない条件なので、順序を直すのが正解です。

</details>

## 確認クイズ

### Q1. `const f = (x: number): number => x * 2;` の`f(3)`の結果はどれですか?

- A. `6`
- B. `undefined`
- C. エラーになる

<details>
<summary>答え</summary>

**A** — 中かっこと`return`を省略した形です。式の結果が自動で返ります。

</details>

### Q2. 定義より前の行で呼び出せるのはどれですか?

- A. 関数宣言
- B. 関数式
- C. アロー関数

<details>
<summary>答え</summary>

**A** — 関数式とアロー関数は変数なので、宣言前には使えません。

</details>

### Q3. 「関数は値である」とはどういう意味ですか?

- A. 関数は必ず値を返さなければならない
- B. 関数を変数に代入できる
- C. 関数の中では値しか使えない

<details>
<summary>答え</summary>

**B** — 数値や文字列と同じように扱えます。この性質がレッスン4-5のコールバックにつながります。

</details>

### Q4. 本研修で基本とする書き方はどれですか?

- A. 関数宣言
- B. 関数式
- C. アロー関数

<details>
<summary>答え</summary>

**C** — 実務でも新しいコードはアロー関数が主流です。ただし配属先の規約があればそちらが優先です。

</details>
