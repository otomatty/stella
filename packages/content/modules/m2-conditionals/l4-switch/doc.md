# レッスン2-4 switch

## このレッスンの目標

- [ ] `switch`で1つの値を複数の候補と比べられる
- [ ] フォールスルーの原因と防ぎ方を説明できる
- [ ] リテラルのユニオン型と`switch`の相性の良さを説明できる

## 2-4-1 switch文

> **`switch`は1つの値を複数の候補と上から順に比べる**

`else if`を4つも5つも重ねると、同じ変数名が何度も出てきて読みにくくなります。注文の状態、会員ランク、支払い方法のように「1つの値で多方向に分かれる」分岐は業務に多く、それ専用の書き方が`switch`です。

- **`case`** — 候補。等価比較(`===`)で判定される
- **`break`** — その`case`で処理を終える合図
- **`default`** — どの`case`にも当たらなかったとき

```ts
const status = "shipped";

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
// => "発送済み"
```

`else if`で書いた場合と比べると、変数名が1回しか出てこない読みやすさがあります。

使い分けの目安は次のとおりです。

- **1つの値を、決まった候補と比べる** → `switch`
- **条件がそれぞれ違う(範囲や複数条件)** → `if` / `else if`

2-2-3の会員ランクのような「範囲」の分岐は`switch`では書きにくく、状態名のような「候補」なら`switch`が読みやすくなります。

## 2-4-2 breakの書き忘れ

> **`break`を書き忘れると、次の`case`の中身まで続けて実行される**

この現象を**フォールスルー**(落ちていく)と呼びます。

```ts
const status = "received";

switch (status) {
  case "received":
    console.log("受付済み");
  // ← breakがない
  case "shipped":
    console.log("発送済み");
    break;
}
// => "受付済み"
// => "発送済み"  ← 意図していない
```

`case`は「入り口」を決めるだけで、出口を決めるのは`break`です。この理解があると忘れにくくなります。

![breakがないと次のcaseへ処理が落ちていく図](t2-fallthrough/assets/fallthrough.svg)

エラーにならないので、動かしてみるまで気づけません。防ぎ方は単純で、**`case`を書いたら必ず`break`をセットで書く**ことです。Module 9で学ぶESLintを使うと、書き忘れを自動で検出できます。

## 2-4-3 switchとリテラルのユニオン型

> **リテラルのユニオン型を`switch`で分けると、候補の書き間違いを実行前に防げる**

`case "shiped":` のようなタイポは、`string`型のままでは誰も止めてくれません。その`case`に永遠に入らない、静かなバグになります。

レッスン1-5で学んだリテラルのユニオン型を使うと、その場でエラーになります。

```ts
const status: "received" | "shipped" = "shipped";

switch (status) {
  case "received":
    console.log("受付済み");
    break;
  case "shiped": // タイポ
    // エラー: Type '"shiped"' is not comparable to
    // type '"received" | "shipped"'.
    break;
}
```

`comparable`は「比べられる」という意味です。存在しない候補と比べても意味がない、とコンパイラーが教えてくれています。

さらに、2-3-2で学んだ絞り込みは`switch`でも働きます。

```ts
const status: "received" | "shipped" = "shipped";

switch (status) {
  case "shipped":
    const label: "shipped" = status; // OK
    break;
}
```

それぞれの`case`の中では、値がその候補に確定しています。Module 5では、この仕組みを使って**分岐の書き漏れ**まで検出する方法を学びます。

## もっと知りたい人へ

- [switch文](https://typescriptbook.jp/reference/statements/switch) — switchの詳しい説明
- [switchのフォールスルー問題](https://typescriptbook.jp/reference/statements/switch-fallthrough) — フォールスルーの詳しい説明

---

演習は [practice.md](practice.md) にあります。
