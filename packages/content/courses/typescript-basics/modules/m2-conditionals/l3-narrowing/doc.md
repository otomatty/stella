# レッスン2-3 条件で型を絞り込む

## このレッスンの目標

- [ ] truthy / falsyな値を判別できる
- [ ] 条件分岐で型が確定する仕組みを説明できる
- [ ] `??`で既定値を用意できる

## 2-3-1 truthyな値とfalsyな値

> **条件には`boolean`以外も書ける。`0`と空文字は`false`扱いになる**

実務のコードには `if (userName) { ... }` のような書き方が頻出します。比較演算子がないのに条件として成立する理由がこれです。

- **falsyな値**(false扱い): `false` `0` `""` `undefined` `null` `NaN`
- **truthyな値**(true扱い): **それ以外すべて**

falsyは6つだけなので、こちらを覚えて「残りは全部truthy」と整理してください。`""`は引用符2つだけの空文字、`NaN`は計算に失敗した数値です。

```ts
const userName = "";

if (userName) {
  console.log("ようこそ");
} else {
  console.log("名前が未入力です");
}
// => "名前が未入力です"
```

「値が入っているか」をひとことで確かめられるのが、この書き方が好まれる理由です。

![truthyな値とfalsyな値の分類図](t1-truthy-falsy/assets/truthy-falsy.svg)

**落とし穴は`0`です。** 在庫が0件のときや金額が0円のときも「値がない」と判定されてしまいます。数値を判定するときはfalsy頼みにせず、`stock === 0`のように明示的に比較してください。

## 2-3-2 条件分岐で型が確定する

> **`if`で値の有無を確かめると、そのブロックの中では型が確定する**

レッスン1-6の最後に「値があるか確かめてから使う書き方はModule 2で学ぶ」と予告した、その回収です。

`string | undefined`の値は、そのままでは`string`として使えません。

```ts
const phone: string | undefined = "090-1234-5678";

const display: string = phone;
// エラー: Type 'string | undefined' is not
// assignable to type 'string'.
```

値が入っているように見えても、型の上では`undefined`の可能性が残っているためです。

`if`で確かめると通ります。

```ts
const phone: string | undefined = "090-1234-5678";

if (phone !== undefined) {
  const display: string = phone; // OK
  console.log(display); // => "090-1234-5678"
}
```

この働きを**絞り込み**と呼びます。人が「大丈夫だ」と主張するのではなく、**コンパイラーが条件を読んで型を狭めてくれる**のが重要な点です。

Playgroundで`phone`にマウスカーソルを乗せると、ブロックの内と外で表示される型が違うことを確認できます。

## 2-3-3 「??」で既定値を用意する

> **`??`は、左が`null`か`undefined`のときだけ右の値を使う**

「ニックネームが未設定なら『ゲスト』と表示する」ような既定値は頻出します。毎回`if`で囲むのは大げさなので、専用の演算子を使います。

```
値 ?? 値がなかったときの代わり
```

```ts
const nickname: string | undefined = undefined;

const display = nickname ?? "ゲスト";
console.log(display); // => "ゲスト"
```

クエスチョンマーク2つで**null合体演算子**と読みます。「左がなければ右」と覚えてください。`undefined`の可能性が消えるので、`display`の型は`string`に確定します。

似た演算子に`||`がありますが、こちらは2-3-1のfalsy判定なので挙動が違います。

```ts
const stock = 0;

console.log(stock ?? 10); // => 0  (0は「値がある」)
console.log(stock || 10); // => 10 (0はfalsy)
```

在庫0が10に化ける事故につながります。**既定値を入れたいなら`??`を使ってください。**

## もっと知りたい人へ

- [truthyな値、falsyな値](https://typescriptbook.jp/reference/values-types-variables/truthy-falsy) — 判定の詳しい説明
- [制御フロー分析と型ガードによる型の絞り込み](https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard) — 絞り込みの詳しい説明

---

演習は [practice.md](practice.md) にあります。
