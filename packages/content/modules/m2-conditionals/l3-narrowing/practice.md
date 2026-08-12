# レッスン2-3 演習 — 条件で型を絞り込む

対象トピック: 2-3-1 〜 2-3-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const nickname: string | undefined = undefined;

if (nickname !== undefined) {
  console.log(`ようこそ、${nickname}さん`);
} else {
  console.log("ようこそ、ゲストさん");
}

const display = nickname ?? "ゲスト";
console.log(display); // => "ゲスト"
```

写経できたら、次の改造をしてみましょう。

1. `nickname`に`"田中"`を入れて、両方の結果がどう変わるか確認しましょう
2. `if`ブロックの中と外で`nickname`にマウスカーソルを乗せ、表示される型を見比べましょう
3. `const stock = 0;` を書き、`stock ?? 10` と `stock || 10` の結果を見比べましょう

## 演習問題

### 問1(基本)

次の6つの値について、truthyかfalsyかを予想してから、`if`で確かめてください。

`0` / `1` / `""` / `"0"` / `undefined` / `false`

### 問2(基本)

`note`(型は`string | undefined`)の値を、次のルールで表示してください。

- 値があれば、そのまま表示する
- 値がなければ「備考なし」と表示する

`??`を使う書き方と、`if` / `else`を使う書き方の両方を書いてください。

### 問3(応用)

次のコードはエラーになります。エラーメッセージを読み、なぜコンパイラーが止めるのかを説明したうえで、エラーが出ないよう直してください。

```ts
const couponCode: string | undefined = "SPRING10";

const upper: string = couponCode;
console.log(upper);
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

| 値 | 判定 |
| --- | --- |
| `0` | falsy |
| `1` | truthy |
| `""` | falsy |
| `"0"` | **truthy** |
| `undefined` | falsy |
| `false` | falsy |

間違えやすいのは`"0"`です。引用符が付いているので文字列であり、空文字ではないためtruthyになります。値の見た目ではなく型を見る、というレッスン1-4の`+`の話と同じ観点です。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const note: string | undefined = undefined;

// ?? を使う書き方
console.log(note ?? "備考なし"); // => "備考なし"

// if / else を使う書き方
if (note !== undefined) {
  console.log(note);
} else {
  console.log("備考なし");
}
// => "備考なし"
```

どちらも結果は同じです。既定値を入れたいだけなら`??`のほうが短く、意図も明確です。値の有無で**処理そのもの**を変えたい場合は`if`を使います。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const couponCode: string | undefined = "SPRING10";

if (couponCode !== undefined) {
  const upper: string = couponCode; // OK
  console.log(upper); // => "SPRING10"
}
```

`couponCode`の型は`string | undefined`です。値が入っているように見えますが、型の上では`undefined`の可能性が残っているため、`string`型の変数には代入できません。

`if`で`undefined`でないことを確かめると、そのブロックの中では型が`string`に確定します(絞り込み)。

`??`を使う書き方でも解決できます。

```ts
const upper: string = couponCode ?? "";
```

</details>

## 確認クイズ

### Q1. falsyな値はどれですか?

- A. `"0"`
- B. `0`
- C. `"false"`

<details>
<summary>答え</summary>

**B** — 引用符が付いた`"0"`や`"false"`は空でない文字列なのでtruthyです。falsyな数値は`0`だけです。

</details>

### Q2. `if (phone !== undefined) { ... }` のブロックの中で、`string | undefined`型の`phone`はどう扱われますか?

- A. `string | undefined`のまま
- B. `string`に確定する
- C. `undefined`に確定する

<details>
<summary>答え</summary>

**B** — コンパイラーが条件を読んで型を狭めてくれます。これを絞り込みと呼びます。

</details>

### Q3. `const stock = 0;` のとき、`stock ?? 10` の結果はどれですか?

- A. `0`
- B. `10`
- C. `undefined`

<details>
<summary>答え</summary>

**A** — `??`は`null`か`undefined`のときだけ右を使います。`0`は「値がある」と判定されます。`||`だと`10`になってしまうので、既定値には`??`を使います。

</details>
