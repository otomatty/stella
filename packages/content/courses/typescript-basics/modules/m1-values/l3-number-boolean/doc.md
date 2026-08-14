# レッスン1-3 数値と真偽値

## このレッスンの目標

- [ ] プリミティブ型の全体像を説明できる
- [ ] `number`型で四則演算ができ、小数の誤差に注意できる
- [ ] `boolean`型の値が`true`と`false`の2つだけだと理解している

## 1-3-1 プリミティブ型は7種類

> **プリミティブ型は7種類あるが、研修で使うのはnumber・string・booleanの3つ**

検索すると`symbol`や`bigint`といった知らない型名が出てきます。全体像がないと、覚える量が無限にあるように見えてしまうので、最初に地図を持っておきます。

**プリミティブ型**とは、それ以上分解できない基本の値の種類です。全部で7種類あります。

| 型 | 用途 | 本研修での扱い |
| --- | --- | --- |
| `number` | 数値 | 主役 |
| `string` | 文字列 | 主役 |
| `boolean` | 真偽値 | 主役 |
| `undefined` | 値がまだない | レッスン1-6 |
| `null` | 意図的に空 | レッスン1-6 |
| `symbol` | 一意の識別子 | 名前だけ |
| `bigint` | 巨大な整数 | 名前だけ |

`symbol`と`bigint`は実務で書く機会がほとんどありません。名前を知っていれば十分です。

![プリミティブ型7種類の全体マップ。上の3つが主役、下の4つは優先度が低い](t1-primitive-types/assets/primitive-map.svg)

## 1-3-2 number型

> **TypeScriptは整数と小数を区別しない。数値はすべてnumber型**

他の言語では整数と小数で型が分かれていることが多く、「金額は整数型、税率は小数型」と考えると迷子になります。TypeScriptは`number`ひとつだけです。マイナスも小数もすべて`number`です。

```ts
const price = 300; // number
const taxRate = 0.1; // number
const temperature = -3.5; // number

const subtotal = price * 4;
console.log(subtotal); // => 1200
```

四則演算は`+` `-` `*` `/` で行います。掛け算はアスタリスク、割り算はスラッシュです。

## 1-3-3 小数の計算には誤差がある

> **小数の計算はぴったりにならないことがある。金額は整数で計算する**

合計金額が1円だけ合わない、という現象があります。原因を知らないと、コードを何度見直しても見つかりません。

```ts
console.log(0.1 + 0.2); // => 0.30000000000000004
console.log(0.1 + 0.2 === 0.3); // => false
```

コンピューターの小数の持ち方の都合で、わずかな誤差が出ます(三重イコール`===`は「等しいか」を調べる記号です。条件分岐で本格的に使うのはModule 2です)。

実務では、小数を長く持ち回らず、最後に整数へ丸めます。

```ts
const price = 300;
const taxIncluded = Math.round(price * 1.1);
console.log(taxIncluded); // => 330
```

`Math.round`は四捨五入する命令です。理屈の深追いは不要です。「小数の計算には誤差が出る」「金額は整数で計算する」の2点だけ持ち帰ってください。

## 1-3-4 boolean型

> **boolean型に入る値はtrueとfalseの2つだけ**

業務システムは「支払い済みか」「キャンセル済みか」のフラグだらけです。**真偽値**は「はい / いいえ」を表す値で、取りうる値がたった2つしかありません。この単純さゆえに、条件分岐の判定にそのまま使えます。

```ts
const isPaid = true; // boolean
const isCancelled = false; // boolean
console.log(isPaid); // => true
```

変数名を`is○○`にすると、真偽値だと一目で分かります。現場の慣習です。

`true`と`false`にはクォートを付けません。付けるとただの文字列になります。

```ts
const isPaid: boolean = "true";
// エラー: Type 'string' is not assignable to type 'boolean'.
```

## もっと知りたい人へ

- [プリミティブ型](https://typescriptbook.jp/reference/values-types-variables/primitive-types) — 7種類の一覧と性質
- [number型](https://typescriptbook.jp/reference/values-types-variables/number) — 数値の詳しい仕様と誤差の話
- [boolean型](https://typescriptbook.jp/reference/values-types-variables/boolean) — 真偽値の詳しい説明

---

演習は [practice.md](practice.md) にあります。
