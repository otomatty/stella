# レッスン5-1 演習 — ユニオン型を深める

対象トピック: 5-1-1 〜 5-1-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
type Success = { status: "success"; data: string };
type Failure = { status: "failure"; message: string };

type Result = Success | Failure;

const show = (result: Result): string => {
  if (result.status === "success") {
    return `成功: ${result.data}`;
  }
  return `失敗: ${result.message}`;
};

console.log(show({ status: "success", data: "取得しました" }));
console.log(show({ status: "failure", message: "見つかりません" }));
```

写経できたら、次の改造をしてみましょう。

1. `if`の中と外で`result`にカーソルを乗せ、表示される型を見比べましょう
2. `status`の型を`string`に変えて、絞り込みが効かなくなることを確認しましょう
3. `if`を`switch`に書き換えても同じように動くことを確認しましょう

## 演習問題

### 問1(基本)

次のコードはエラーになります。理由を説明してください。

```ts
const value: string | number = "コーヒー";
console.log(value.length);
```

### 問2(基本)

問1のコードを、`if`で絞り込んでエラーが出ないよう直してください。`string`のときだけ文字数を、`number`のときは2倍した値を表示してください。

### 問3(応用)

図形の面積を求める型を設計してください。円(半径を持つ)と長方形(幅と高さを持つ)の2種類で、判別可能なユニオン型にしてください。面積を返す関数`area`も書いてください。

- 円の面積は `3.14 * 半径 * 半径`
- 長方形の面積は `幅 * 高さ`

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`value`の型は`string | number`です。`length`は`string`にはありますが`number`にはないため、両方に共通する操作ではありません。

値としては文字列が入っていても、**型の上では`number`の可能性が残っている**ので、コンパイラーは許可しません。ユニオン型の値は、どちらの型でもできることしか使えません。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const value: string | number = "コーヒー";

if (typeof value === "string") {
  console.log(value.length); // => 4
} else {
  console.log(value * 2);
}
```

`typeof`で分岐すると、`if`の中では`string`、`else`の中では`number`に確定します。両方の枝で、それぞれの型にしかない操作が使えるようになります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
type Circle = { kind: "circle"; radius: number };
type Rectangle = { kind: "rectangle"; width: number; height: number };

type Shape = Circle | Rectangle;

const area = (shape: Shape): number => {
  if (shape.kind === "circle") {
    return 3.14 * shape.radius * shape.radius;
  }
  return shape.width * shape.height;
};

console.log(area({ kind: "circle", radius: 2 })); // => 12.56
console.log(area({ kind: "rectangle", width: 3, height: 4 })); // => 12
```

`kind`が両方の型にあり、値がリテラル型(`"circle"` / `"rectangle"`)である点が重要です。この2つがそろって初めて絞り込めます。

目印のプロパティ名は`kind`でも`type`でも`status`でも構いません。チーム内で統一されていることのほうが大事です。

</details>

## 確認クイズ

### Q1. `const x: string | number` に対して、そのまま使える操作はどれですか?

- A. `x.length`
- B. `x.toFixed(2)`
- C. どちらも使えない

<details>
<summary>答え</summary>

**C** — `length`は`string`だけ、`toFixed`は`number`だけの操作です。両方に共通する操作しか使えません。

</details>

### Q2. オブジェクト同士のユニオン型を`typeof`で分けられますか?

- A. 分けられる
- B. 分けられない。どちらも`"object"`を返す

<details>
<summary>答え</summary>

**B** — オブジェクトはすべて`"object"`を返すので、型の区別には使えません。

</details>

### Q3. 判別可能なユニオン型の目印(ディスクリミネータ)に必要な条件はどれですか?

- A. 両方の型にあり、値がリテラル型であること
- B. 片方の型にだけあること
- C. 値が`string`型であること

<details>
<summary>答え</summary>

**A** — 両方にあるから絞り込む前に読め、リテラル型だから比較で確定できます。`string`型では絞り込めません。

</details>
