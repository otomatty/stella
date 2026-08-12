# レッスン1-5 演習 — リテラル型とユニオン型

対象トピック: 1-5-1 〜 1-5-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
let taskStatus: "todo" | "doing" | "done" = "todo";
taskStatus = "doing";

let priority: 1 | 2 | 3 = 1;
priority = 3;

console.log(taskStatus); // => "doing"
console.log(priority); // => 3
```

写経できたら、次の改造をしてみましょう。

1. `taskStatus = "完了";`を追加して、エラーメッセージに選択肢がすべて並ぶことを確認しましょう
2. `priority = 5;`を追加して、数値でも同じように弾かれることを確認しましょう
3. `const plan = "premium";`と`let currentPlan = "premium";`を書き、それぞれにマウスカーソルを乗せて型を見比べましょう

## 演習問題

### 問1(基本)

注文の状態を表す変数`orderStatus`を宣言してください。取りうる値は「received」「shipped」「delivered」の3つだけです。初期値は「received」にしてください。

### 問2(基本)

次のコードはエラーになります。エラーメッセージを読んで、原因と直し方を説明してください。

```ts
let seatClass: "economy" | "business" | "first" = "Economy";
console.log(seatClass);
```

### 問3(応用)

社員番号は、旧システムでは数値(例: `1001`)、新システムでは文字列(例: `"E-1001"`)で管理されています。どちらも受け取れる変数`employeeId`を宣言し、両方の値を順に代入して表示してください。あわせて、`true`を代入しようとするとどうなるかも確認してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
let orderStatus: "received" | "shipped" | "delivered" = "received";
orderStatus = "shipped";
console.log(orderStatus); // => "shipped"
```

リテラル型を`|`でつなぐと、決まった値だけを許す型になります。業務上の状態遷移をそのまま型で表現できます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
let seatClass: "economy" | "business" | "first" = "economy";
console.log(seatClass); // => "economy"
```

「Type '"Economy"' is not assignable to type '"economy" | "business" | "first"'.」というエラーになります。原因は先頭が大文字になっていることです。

リテラル型は大文字と小文字を区別します。`string`型なら通ってしまい、後の条件分岐が静かに外れるところでした。この種のタイポを実行前に潰せるのがリテラル型の価値です。

</details>

<details>
<summary>問3の解答例</summary>

```ts
let employeeId: number | string = 1001;
console.log(employeeId); // => 1001

employeeId = "E-1001";
console.log(employeeId); // => "E-1001"

employeeId = true;
// エラー: Type 'boolean' is not assignable to type 'string | number'.
```

ユニオン型は「つないだ型のどれか」を表します。`number`と`string`は受け入れますが、`boolean`は弾かれます。「なんでも入る型」ではない点が重要です。

</details>

## 確認クイズ

### Q1. `let size: "S" | "M" | "L" = "M";`に対して、エラーにならない代入はどれですか?

- A. `size = "L";`
- B. `size = "XL";`
- C. `size = "m";`

<details>
<summary>答え</summary>

**A** — 型に並んでいる3つの値だけが代入できます。`"XL"`は選択肢にありません。`"m"`は小文字なので別の値として扱われます。

</details>

### Q2. ユニオン型を書くときに使う記号はどれですか?

- A. `&`
- B. `|`
- C. `+`

<details>
<summary>答え</summary>

**B** — 縦棒`|`でつなぎます。「または」と読みます。

</details>

### Q3. `const plan = "premium";`と書いたとき、`plan`の型はどれですか?

- A. `string`
- B. `"premium"`
- C. 型は付かない

<details>
<summary>答え</summary>

**B** — `const`は再代入されないと確定しているため、値そのものがリテラル型として推論されます。`let`で書いた場合は`string`になります。

</details>

### Q4. `let memberId: number | string = 1001;`のあと、代入できない値はどれですか?

- A. `"A-1001"`
- B. `2002`
- C. `true`

<details>
<summary>答え</summary>

**C** — ユニオン型でつないだ`number`と`string`だけが代入できます。`boolean`は含まれていません。

</details>
