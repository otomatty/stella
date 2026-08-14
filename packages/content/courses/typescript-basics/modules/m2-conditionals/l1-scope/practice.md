# レッスン2-1 演習 — ブロックとスコープ

対象トピック: 2-1-1 〜 2-1-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const shopName = "青山コーヒー店";

{
  const staffName = "田中";
  console.log(shopName); // => "青山コーヒー店"
  console.log(staffName); // => "田中"
}

console.log(shopName); // => "青山コーヒー店"
```

写経できたら、次の改造をしてみましょう。

1. 最終行のあとに `console.log(staffName);` を追加して、エラーメッセージを読みましょう
2. ブロックの中に `const shopName = "渋谷コーヒー店";` を追加し、内と外の`console.log`の結果を見比べましょう
3. ブロックをもう1つ入れ子にして、いちばん内側から`shopName`が見えるか確認しましょう

## 演習問題

### 問1(基本)

次のコードは3行目でエラーになります。理由を説明してください。

```ts
{
  const orderId = "A-1001";
}
console.log(orderId);
```

### 問2(基本)

次のコードの出力を予想してから実行し、答え合わせをしてください。

```ts
const price = 500;

{
  const price = 300;
  console.log(price);
}

console.log(price);
```

### 問3(応用)

次のコードは、割引後の価格を表示したいのに`1000`のままです。原因を説明し、意図どおりに動くよう直してください。

```ts
let price = 1000;

{
  let price = 1000 * 0.8;
}

console.log(price); // 期待: 800
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`orderId`はブロックの中で宣言されているため、ブロックの外からは見えません。「Cannot find name 'orderId'.」というエラーになります。

外でも使いたいのであれば、ブロックの外で宣言します。

```ts
const orderId = "A-1001";
{
  console.log(orderId); // => "A-1001"
}
console.log(orderId); // => "A-1001"
```

</details>

<details>
<summary>問2の解答例</summary>

```
300
500
```

ブロックの中で同じ名前を宣言しているため、シャドーイングが起きています。ブロックの中では内側の`price`(300)が見え、ブロックを抜けると外側の`price`(500)が再び見えます。

外側の値は書き換わっていません。

</details>

<details>
<summary>問3の解答例</summary>

```ts
let price = 1000;

{
  price = 1000 * 0.8; // let を書かない = 外の変数への再代入
}

console.log(price); // => 800
```

元のコードは`let price = ...`と**宣言**しているため、ブロックの中に新しい変数が作られていました。外側の`price`は一度も変更されていません。

外側の変数を変えたいのであれば、宣言せずに代入だけを書きます。この違いは目で見つけにくいので、そもそも内と外で同じ名前を使わないほうが安全です。

</details>

## 確認クイズ

### Q1. ブロックとは何を指しますか?

- A. ファイル全体
- B. 中かっこ`{ }`で囲まれた範囲
- C. 1行のコード

<details>
<summary>答え</summary>

**B** — 中かっこで囲まれた範囲がブロックです。その中で宣言した変数のスコープはブロックの中だけになります。

</details>

### Q2. ブロックの内側から、外側で宣言した変数は使えますか?

- A. 使える
- B. 使えない
- C. `let`のときだけ使える

<details>
<summary>答え</summary>

**A** — 内側からは外が見えます。逆に外からは内側が見えません。一方通行です。

</details>

### Q3. シャドーイングが起きたとき、外側の変数はどうなりますか?

- A. 内側の値に書き換わる
- B. 消える
- C. 変わらない。ブロックの中で隠れているだけ

<details>
<summary>答え</summary>

**C** — 別の変数が手前に立っているだけです。ブロックを抜ければ外側の変数が再び見えます。

</details>
