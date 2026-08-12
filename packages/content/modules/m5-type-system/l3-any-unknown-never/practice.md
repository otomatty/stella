# レッスン5-3 演習 — any・unknown・never

対象トピック: 5-3-1 〜 5-3-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const a: any = "コーヒー";
const u: unknown = "コーヒー";

console.log(a.length); // OK(チェックされない)
// console.log(u.length); // エラー

if (typeof u === "string") {
  console.log(u.length); // => 4
}
```

写経できたら、次の改造をしてみましょう。

1. `console.log(u.length);` のコメントを外して、エラーメッセージを読みましょう
2. `console.log(a.toFixed(2));` を追加し、コンパイルは通るのに実行時に落ちることを確認しましょう
3. `u`に数値を入れて、`typeof u === "number"` の分岐を足してみましょう

## 演習問題

### 問1(基本)

`unknown`型の値を受け取り、次のように返す関数`stringify`を書いてください。

- `string` なら そのまま返す
- `number` なら 文字列に埋め込んで返す
- それ以外なら 「不明な値」を返す

### 問2(基本)

次のコードは実行時にエラーになります。なぜコンパイラーが止めてくれないのか説明し、`unknown`を使って安全に書き直してください。

```ts
const data: any = { name: "田中" };
console.log(data.profile.age);
```

### 問3(応用)

次の型と関数に、網羅性チェックを追加してください。追加したうえで`Status`に`"cancelled"`を足し、エラーが出ることを確認してください。

```ts
type Status = "todo" | "doing" | "done";

const label = (status: Status): string => {
  switch (status) {
    case "todo":
      return "未着手";
    case "doing":
      return "進行中";
    case "done":
      return "完了";
  }
};
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const stringify = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return `${value}`;
  }
  return "不明な値";
};

console.log(stringify("コーヒー")); // => "コーヒー"
console.log(stringify(480)); // => "480"
console.log(stringify(true)); // => "不明な値"
```

`unknown`はそのままでは何もできないので、`typeof`で確かめてから使います。確かめた分だけ安全に使えるようになる、という関係です。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const data: unknown = { name: "田中" };

if (typeof data === "object" && data !== null && "profile" in data) {
  console.log(data.profile);
} else {
  console.log("profileがありません");
}
// => "profileがありません"
```

元のコードが止まらないのは、型が`any`だからです。`any`はすべてのチェックを素通りさせるので、`data.profile`が`undefined`であることも、その先の`.age`が実行時に落ちることも、コンパイラーは検出しません。

`unknown`にすると、使う前に確かめることを強制されます。`null`の除外が必要なのは、レッスン1-6で見たとおり`typeof null`が`"object"`になるためです。

</details>

<details>
<summary>問3の解答例</summary>

```ts
type Status = "todo" | "doing" | "done";

const label = (status: Status): string => {
  switch (status) {
    case "todo":
      return "未着手";
    case "doing":
      return "進行中";
    case "done":
      return "完了";
    default:
      const check: never = status;
      return check;
  }
};
```

`Status`に`"cancelled"`を足すと、`default`の行で次のエラーが出ます。

```
Type '"cancelled"' is not assignable to type 'never'.
```

`switch`に`case "cancelled"`を書き足せばエラーは消えます。型を変えた瞬間に、直すべき場所を教えてくれるのが網羅性チェックの価値です。

</details>

## 確認クイズ

### Q1. `const x: any = "abc";` のあと、`x.toFixed(2)` を書くとどうなりますか?

- A. コンパイルエラーになる
- B. コンパイルは通り、実行時にエラーになる
- C. 何も起きない

<details>
<summary>答え</summary>

**B** — `any`はすべてのチェックを止めます。エラーが消えるのではなく、見えなくなるだけです。

</details>

### Q2. `unknown`型の値をそのまま使えますか?

- A. 使える
- B. 使えない。絞り込んでから使う

<details>
<summary>答え</summary>

**B** — 何でも代入できますが、そのままでは何もできません。この一手間が安全につながります。

</details>

### Q3. 型が分からない値を受け取るとき、選ぶべきなのはどちらですか?

- A. `any`
- B. `unknown`

<details>
<summary>答え</summary>

**B** — `unknown`なら後から型を特定する処理を足せます。`any`だとそこから先は誰も検査しません。

</details>

### Q4. 網羅性チェックは何を検出しますか?

- A. 型の書き間違い
- B. `switch`の分岐の書き漏れ
- C. 実行時のエラー

<details>
<summary>答え</summary>

**B** — ユニオン型に選択肢を足したのに分岐を書き足していない、という状態を実行前に検出します。

</details>
