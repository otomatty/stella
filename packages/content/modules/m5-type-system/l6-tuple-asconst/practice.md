# レッスン5-6 演習 — タプル・as const・satisfies

対象トピック: 5-6-1 〜 5-6-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
type Config = { env: string };

const point: [number, number] = [35.68, 139.76];
const [lat, lng] = point;

const c1 = { env: "production" };
const c2 = { env: "production" } as const;
const c3 = { env: "production" } as const satisfies Config;

console.log(lat, lng); // => 35.68 139.76
console.log(c1.env, c2.env, c3.env);
```

写経できたら、次の改造をしてみましょう。

1. `c1.env`・`c2.env`・`c3.env` にカーソルを乗せ、表示される型を見比べましょう
2. `point` に要素を1つ足して、エラーメッセージを読みましょう
3. `c3` の `env` を `envv` にタイポして、`satisfies`が検出することを確認しましょう

## 演習問題

### 問1(基本)

商品名(文字列)と価格(数値)の組を表すタプル型を宣言し、分割代入で取り出して表示してください。

### 問2(基本)

次の`enum`を、リテラルのユニオン型に書き換えてください。

```ts
enum Priority {
  Low = "low",
  High = "high",
}
```

### 問3(応用)

次のコードでは`config.env`の型が`string`になってしまいます。`"production"`のまま、かつ`Config`を満たしているかのチェックも効くように直してください。

```ts
type Config = { env: string; port: number };

const config: Config = { env: "production", port: 3000 } as const;
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const item: [string, number] = ["コーヒー", 480];

const [name, price] = item;
console.log(`${name}: ${price}円`); // => "コーヒー: 480円"
```

角かっこの中に型を順番に並べます。個数も順番も固定なので、`[480, "コーヒー"]`は代入できません。

項目が3つ以上になるなら、オブジェクト(`{ name: string; price: number }`)のほうが読みやすくなります。

</details>

<details>
<summary>問2の解答例</summary>

```ts
type Priority = "low" | "high";

const priority: Priority = "low";
console.log(priority); // => "low"
```

`enum`は変換後のJavaScriptにコードが残りますが、リテラルのユニオン型なら何も残りません。使い方もほぼ同じで、`switch`との相性(2-4-3)や網羅性チェック(5-3-4)もそのまま使えます。

</details>

<details>
<summary>問3の解答例</summary>

```ts
type Config = { env: string; port: number };

const config = { env: "production", port: 3000 } as const satisfies Config;

console.log(config.env); // 型は "production"
```

元のコードは`: Config`という型注釈を付けているため、`as const`で固定した`"production"`が`string`に上書きされていました。型注釈は「この型として扱え」という指示だからです。

`satisfies`は「この型を満たしているか確かめるだけ」なので、推論された狭い型が残ります。チェックも効いているので、`env`を`envv`とタイポすれば検出されます。

</details>

## 確認クイズ

### Q1. `[number, string]` という型が表すものはどれですか?

- A. 数値か文字列が入る配列
- B. 1番目が数値、2番目が文字列の、要素2つの配列
- C. 数値の配列と文字列の配列

<details>
<summary>答え</summary>

**B** — タプルは型も個数も順番も固定します。

</details>

### Q2. 本研修で`enum`を使わない理由はどれですか?

- A. 構文エラーになるから
- B. 変換後のJavaScriptにコードが残り、リテラルのユニオン型で代替できるから
- C. 型が付かないから

<details>
<summary>答え</summary>

**B** — TypeScriptの型は本来コンパイル時に消えますが、`enum`は例外です。

</details>

### Q3. `const c = { env: "prod" } as const;` のとき、`c.env`の型はどれですか?

- A. `string`
- B. `"prod"`
- C. `readonly string`

<details>
<summary>答え</summary>

**B** — `as const`で値そのものがリテラル型に固定されます。あわせて`readonly`にもなります。

</details>

### Q4. 型注釈と`satisfies`の違いはどれですか?

- A. 型注釈は推論された型を上書きし、`satisfies`はチェックだけ行う
- B. どちらも同じ
- C. `satisfies`は型を上書きする

<details>
<summary>答え</summary>

**A** — 「チェックはしたいが、狭い型は残したい」場面で`satisfies`を使います。

</details>
