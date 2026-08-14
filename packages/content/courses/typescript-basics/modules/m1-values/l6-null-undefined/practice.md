# レッスン1-6 演習 — nullとundefined

対象トピック: 1-6-1 〜 1-6-5

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
let shippedAt;
console.log(shippedAt); // => undefined

const middleName = null;
console.log(middleName); // => null

console.log(typeof shippedAt); // => "undefined"
console.log(typeof middleName); // => "object"

let phoneNumber: string | undefined = undefined;
phoneNumber = "090-0000-0000";
console.log(phoneNumber); // => "090-0000-0000"
```

写経できたら、次の改造をしてみましょう。

1. `phoneNumber = 12345;`を追加して、エラーメッセージを読んでみましょう
2. `const phone: string | undefined = undefined;`のあとに`console.log(phone.length);`を書き、どんなエラーが出るか確認しましょう
3. `console.log("undefined");`と`console.log(undefined);`を並べて実行し、表示の違いを見比べましょう

## 演習問題

### 問1(基本)

任意入力の項目を表す変数を2つ宣言してください。どちらも「値がまだない」状態から始めます。

- 発送日(文字列。未発送のときは値がない)
- 備考(文字列。未入力のときは値がない)

型注釈を付けて、「値がないこともある」ことを型で表現してください。

### 問2(基本)

次のコードの出力を予想してから、Playgroundで実行して確かめてください。予想と違ったものについては、なぜそうなるか説明してください。

```ts
console.log(typeof 480);
console.log(typeof "480");
console.log(typeof true);
console.log(typeof undefined);
console.log(typeof null);
```

### 問3(応用)

次のコードはエラーになります。エラーメッセージを読み、なぜコンパイラーが止めてくれるのかを説明してください。修正は不要です(直し方はModule 2で学びます)。

```ts
const nickname: string | undefined = undefined;
console.log(nickname.length);
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
let shippedAt: string | undefined = undefined;
let note: string | undefined = undefined;

console.log(shippedAt); // => undefined
console.log(note); // => undefined

shippedAt = "2026-08-09";
console.log(shippedAt); // => "2026-08-09"
```

「文字列が入ることもあるし、値がないこともある」をユニオン型で表します。本研修の方針では、「値がない」は`null`ではなく`undefined`に統一します。

</details>

<details>
<summary>問2の解答例</summary>

```ts
console.log(typeof 480); // => "number"
console.log(typeof "480"); // => "string"
console.log(typeof true); // => "boolean"
console.log(typeof undefined); // => "undefined"
console.log(typeof null); // => "object"
```

最後の1行だけが直感に反します。`typeof null`は`"null"`ではなく`"object"`を返します。JavaScript初期からのバグで、互換性のために修正されずに残っているものです。

このため、`null`かどうかの判定に`typeof`を使ってはいけません。`value === null`と直接比較します。

</details>

<details>
<summary>問3の解答例</summary>

```
エラー: 'nickname' is possibly 'undefined'.
```

`nickname`の型は`string | undefined`なので、`undefined`が入っている可能性があります。`undefined`には`length`がないため、そのまま使うと実行時にエラーになります。

`tsconfig`の`strict`(正確には`strictNullChecks`)が有効だと、コンパイラーがこの危険を実行前に検出してくれます。JavaScriptでいちばん有名な実行時エラー「Cannot read properties of undefined」を、書いている最中に潰せるということです。

「値があるか確かめてから使う」書き方は、Module 2の条件分岐で学びます。

</details>

## 確認クイズ

### Q1. 初期値なしで宣言した変数には、何が入っていますか?

- A. `null`
- B. `undefined`
- C. 何も入っておらず、参照するとエラーになる

<details>
<summary>答え</summary>

**B** — `undefined`が自動で入ります。`undefined`は自然に発生する、というのが`null`との大きな違いです。

</details>

### Q2. `console.log(typeof null);`の出力はどれですか?

- A. `"null"`
- B. `"object"`
- C. `"undefined"`

<details>
<summary>答え</summary>

**B** — JavaScript初期からのバグが、互換性のためそのまま残っています。`null`の判定に`typeof`を使ってはいけません。

</details>

### Q3. 本研修で「値がない」を表すときに使う方針はどれですか?

- A. `null`に統一する
- B. `undefined`に統一し、`null`は外部から受け取るときだけ扱う
- C. そのつど好きなほうを使う

<details>
<summary>答え</summary>

**B** — 2種類あるとチェックも2種類必要になります。統一すると単純に楽になります。ただし配属先の規約があればそちらが優先です。

</details>

### Q4. 「未入力のことがある電話番号」を表す型として適切なものはどれですか?

- A. `string`
- B. `string | undefined`
- C. `undefined`

<details>
<summary>答え</summary>

**B** — `string`だと「必ず値がある」という嘘になります。ユニオン型で「文字列か、値がないか」を正しく表します。

</details>
