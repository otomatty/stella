# レッスン2-4 演習 — switch

対象トピック: 2-4-1 〜 2-4-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const status: "received" | "shipped" | "delivered" = "shipped";

switch (status) {
  case "received":
    console.log("受付済み");
    break;
  case "shipped":
    console.log("発送済み");
    break;
  case "delivered":
    console.log("配達完了");
    break;
}
// => "発送済み"
```

写経できたら、次の改造をしてみましょう。

1. `status`の値を変えて、3つの道をすべて通してみましょう
2. `case "shipped":` の`break`を消して、出力がどう変わるか確認しましょう
3. `case "shiped":` とわざとタイポして、どんなエラーが出るか読みましょう

## 演習問題

### 問1(基本)

支払い方法`method`(型は`"cash" | "credit" | "qr"`)によって、次のように表示する`switch`を書いてください。

- `"cash"` → 「現金払い」
- `"credit"` → 「クレジットカード払い」
- `"qr"` → 「QRコード決済」

### 問2(基本)

次のコードは「受付済み」だけを表示したいのに、3行すべて表示されます。原因を説明し、直してください。

```ts
const status = "received";

switch (status) {
  case "received":
    console.log("受付済み");
  case "shipped":
    console.log("発送済み");
  default:
    console.log("不明な状態");
}
```

### 問3(応用)

次のコードは、会員ランクによって割引率を表示したいものです。`switch`ではなく`if` / `else if`のほうが適していますが、その理由を説明してください。

```ts
const point = 250;
// 500以上 → 20%、100以上 → 10%、それ未満 → 0%
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const method: "cash" | "credit" | "qr" = "qr";

switch (method) {
  case "cash":
    console.log("現金払い");
    break;
  case "credit":
    console.log("クレジットカード払い");
    break;
  case "qr":
    console.log("QRコード決済");
    break;
}
// => "QRコード決済"
```

リテラルのユニオン型で宣言しておくと、`case`に存在しない値を書いた時点でエラーになります。候補が決まっている分岐では、この組み合わせが基本形です。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const status = "received";

switch (status) {
  case "received":
    console.log("受付済み");
    break;
  case "shipped":
    console.log("発送済み");
    break;
  default:
    console.log("不明な状態");
}
// => "受付済み"
```

`break`がないため、最初の`case`に入ったあと、そのまま下の`case`と`default`まで実行されていました(フォールスルー)。

`case`は入り口を決めるだけで、出口を決めるのは`break`です。`case`を書いたら必ず`break`をセットで書いてください。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const point = 250;

if (point >= 500) {
  console.log("20%割引");
} else if (point >= 100) {
  console.log("10%割引");
} else {
  console.log("割引なし");
}
// => "10%割引"
```

`switch`の`case`は等価比較(`===`)でしか判定できません。「500以上」のような**範囲**の条件は`case`に書けないため、`switch`では表現できないのです。

- 決まった候補と一致するか → `switch`
- 範囲や複数条件 → `if` / `else if`

という使い分けになります。

</details>

## 確認クイズ

### Q1. `switch`の`case`はどの方法で判定されますか?

- A. 等価比較(`===`)
- B. 大小比較(`>=`)
- C. truthy / falsy

<details>
<summary>答え</summary>

**A** — 厳密な等価比較です。だから範囲の条件は書けません。

</details>

### Q2. `break`を書き忘れるとどうなりますか?

- A. エラーになる
- B. 次の`case`の中身まで実行される
- C. `switch`全体が実行されない

<details>
<summary>答え</summary>

**B** — フォールスルーと呼びます。エラーが出ないので、動かすまで気づけません。

</details>

### Q3. `case`に、型に存在しない値を書くとどうなりますか(値がリテラルのユニオン型のとき)?

- A. 実行時に無視される
- B. コンパイル時にエラーになる
- C. 何も起きない

<details>
<summary>答え</summary>

**B** — 「Type '"..."' is not comparable to type ...」というエラーになります。タイポを実行前に潰せます。

</details>
