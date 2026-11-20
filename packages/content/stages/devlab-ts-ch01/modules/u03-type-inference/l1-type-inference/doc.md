---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-inference]
---

# レッスン3-1 型推論

## このレッスンの目標

- [ ] 値や return から推論された型を説明できる
- [ ] 添字と条件の順番を確かめ、数の表示を作れる

## 3-1-1 型が自動で決まる

> **値や return から型が決まり、戻り値の型注釈を省けます。**

型推論は、値や処理から TypeScript が型を自動で決める仕組みです。
型注釈を省いても、型は決まっています。
定数の `const` は、入れた値そのものの型になります。
値そのものを表す型をリテラル型と呼びます。
入れ直せる `let` では、同じ種類の値を使える型になります。

```ts
// 送料 SHIPPING_FEE を作り、500を入れる。型は書かない
const SHIPPING_FEE = 500;
// 店名 shopName を入れ直せる変数として作り、"本店" を入れる
let shopName = "本店";
// 入れ直す前の店名を表示する
console.log(shopName);
// 店名を別の文字列に入れ直す
shopName = "駅前店";
// 送料と店名を表示する
console.log(SHIPPING_FEE, shopName);
// 結果: 最初は "本店"、次は 500 "駅前店"。型はそれぞれ 500 と string
```

VS Code で名前にマウスを載せると、推論された型を確かめられます。
よくある間違いは、型注釈がなければ何でも入ると思うことです。
`shopName = 100` は、文字列の変数に数を入れるので型のエラーです。

`export const` は、別のファイルから使える定数を作ります。
`export function` と同じように、外から使える印を付けます。
決まった値の名前には、大文字とアンダースコアを使うことがあります。

```ts
// 注文の上限 MAX_ORDER を作り、10を入れる。別のファイルから使えるようにする
export const MAX_ORDER = 10;
// 営業中か IS_OPEN を作り、falseを入れる。別のファイルから使えるようにする
export const IS_OPEN = false;
// 公開する値を表示する
console.log(MAX_ORDER, IS_OPEN);
// 結果: 10 false。推論された型も 10 と false
```

`true` と `false` は、はい・いいえを表す真偽値です。
`"false"` と引用符で囲むと文字列になるので注意します。

関数は、閉じかっこの後ろの型を省くと、返す値から型が決まります。
数の計算を返すなら `number`、文字列を作って返すなら `string` です。
この形の関数の引数には、型注釈を書きます。

```ts
// 関数 withShipping を作る。price は number、戻り値の型は書かない
function withShipping(price: number) {
  // price に500を足した数を返す
  return price + 500;
  // 関数の中身はここまで
}
// 価格に送料を足した結果を表示する
console.log(withShipping(1200));
// 結果: 1700。戻り値の型は number
```

`return` が二つ以上ある場合は、返す値をまとめた型になります。
次の例の戻り値の型は `"小" | "大"` です。
縦棒は「どちらか」を表し、このような型をユニオン型と呼びます。

```ts
// 関数 sizeLabel を作る。weight は number、戻り値の型は書かない
function sizeLabel(weight: number) {
  // もし weight が2より小さいなら
  if (weight < 2) {
    // "小" を返す
    return "小";
    // 条件の中身はここまで
  }
  // "大" を返す
  return "大";
  // 関数の中身はここまで
}
// 二つの重さのサイズを表示する
console.log(sizeLabel(1), sizeLabel(3));
// 結果: "小" "大"。戻り値の型は "小" | "大"
```

`return` は関数をその場で終えます。
最初の条件に合うと、後ろの `return` までは進みません。
決まった文字列を返す `return` が一つだけの場合、通常は `string` になります。
いつでも値そのものの型になると考えないようにします。

`undefined` は、値がないことを表す特別な値です。
文字列ではないので引用符で囲みません。

```ts
// 関数 pointOf を作る。price は number、isMember は boolean、戻り値の型は書かない
function pointOf(price: number, isMember: boolean) {
  // もし会員なら
  if (isMember) {
    // price を100で割り、切り捨てたポイントを返す
    return Math.floor(price / 100);
    // 条件の中身はここまで
  }
  // 値がないことを返す
  return undefined;
  // 関数の中身はここまで
}
// 会員の場合と、会員でない場合を表示する
console.log(pointOf(1980, true), pointOf(1980, false));
// 結果: 19 undefined。戻り値の型は number | undefined
```

応用では引数の型注釈を消して、出るエラーを自分で確認します。
エラーの内容と、引数だけは型が必要な理由を、自分の言葉で説明します。

参考: サバイバルTypeScript [型推論](https://typescriptbook.jp/reference/values-types-variables/type-inference)。説明と例は教材用に独自作成しています。

## 3-1-2 添字と else if

> **文字の位置と条件の順番を確かめ、数は桁数を決めて表示できます。**

添字は、文字の位置を表す番号です。
`text[0]` のように角かっこで指定し、番号は 0 から数えます。
注文番号から先頭の印を取り出すときにも使えます。

```ts
// 注文番号 orderId を作り、"A-102" を入れる
const orderId = "A-102";
// 先頭 head を作り、0番目の文字を入れる
const head = orderId[0];
// missing を作り、5番目の文字を入れる
const missing = orderId[5];
// 取り出した結果を表示する
console.log(head, missing);
// 結果: "A" undefined。head の型は string | undefined
```

よくある間違いは、先頭を `[1]` と書くことです。
`orderId[1]` は二つ目の文字の `"-"` になります。
5 文字の番号は 0 から 4 までです。5 番目の文字はありません。
空の文字列の 0 番目も `undefined` です。
課題の `noUncheckedIndexedAccess` 設定では、型に `undefined` が入ります。
この設定は、指定位置に値がない可能性も型の確認に含めます。

`else if` は「そうでなく、もし」です。
前の条件に合わなかったときに、次の条件を確かめます。
配送の重さに応じてサイズを選ぶ例を見ます。

```ts
// 関数 sizeOf を作る。weight は number、戻り値の型は書かない
function sizeOf(weight: number) {
  // サイズ size を入れ直せる変数として作り、"大" を入れる
  let size = "大";
  // もし weight が2より小さいなら
  if (weight < 2) {
    // size に "小" を入れ直す
    size = "小";
    // そうでなく、もし weight が5より小さいなら
  } else if (weight < 5) {
    // size に "中" を入れ直す
    size = "中";
    // 条件の中身はここまで
  }
  // size を返す
  return size;
  // 関数の中身はここまで
}
// 重さを変えてサイズを表示する
console.log(sizeOf(1), sizeOf(3), sizeOf(8));
// 結果: "小" "中" "大"。戻り値の型は string
```

| 重さ | 2 より小さい | 5 より小さい | サイズ |
| --- | --- | --- | --- |
| 1 | true | 確かめない | 小 |
| 3 | false | true | 中 |
| 8 | false | false | 大 |

よくある間違いは、全部の条件で処理すると思うことです。
最初に合った処理だけを実行します。並べる順番にも気を付けます。
`let size` の型は `string` なので、この関数の戻り値も `string` です。

数の `.toFixed(桁数)` は、小数点以下の桁数をそろえた文字列を作ります。
平均の数を画面に出すときなどに使います。足りない桁は 0 で埋めます。

```ts
// 平均 average を作り、7を3で割った数を入れる
const average = 7 / 3;
// 表示 text を作り、小数第1位までの文字列を入れる
const text = average.toFixed(1);
// ちょうどの数 rate を作り、25を入れる
const rate = 25;
// 表示 padded を作り、小数第1位までの文字列を入れる
const padded = rate.toFixed(1);
// 表示用の文字列を表示する
console.log(text, padded);
// 結果: "2.3" "25.0"。どちらも string
```

よくある間違いは、結果を数値として計算することです。
計算には変換前の数を使い、最後の表示に `toFixed` を使います。

参考: サバイバルTypeScript [型推論](https://typescriptbook.jp/reference/values-types-variables/type-inference)。説明と例は教材用に独自作成しています。

## もっと知りたい人へ

- サバイバルTypeScript [型推論](https://typescriptbook.jp/reference/values-types-variables/type-inference)
- [知識問題](knowledge.md)で理解を確かめてから、この単元の「01章 q03 型推論」に取り組みます。

## 問題ごとのヒント

ヒントは書き方ガイドの日本語の骨組みです。中の処理を自分でコードに直します。

### 問 1 定数 SITE_NAME を宣言する

**テストで確かめる値**

- `SITE_NAME` → `"Agora"`（値）
- `SITE_NAME` の型 → `"Agora"`（"Agora" だけを表す型）

**ヒント 1 日本語の手順**

```ts
// 定数 SITE_NAME を作り、"Agora" を入れる。型は書かない。ほかのファイルから使えるようにする
```

**ヒント 2 コードへの直し方**

「作り、入れる」は `const`、「ほかのファイルから使えるようにする」は `export` です。問1 の `MAX_ORDER` のサンプルと同じ形です。

### 問 2 定数 MAX_MEMBERS を宣言する

**テストで確かめる値**

- `MAX_MEMBERS` → `50`（値）
- `MAX_MEMBERS` の型 → `50`（50 だけを表す型）

**ヒント 1 日本語の手順**

```ts
// 定数 MAX_MEMBERS を作り、50 を入れる。型は書かない。ほかのファイルから使えるようにする
```

**ヒント 2 コードへの直し方**

問1 と同じ形です。`let` で作ると型が `number` になり、テストに通りません。

### 問 3 定数 IS_BETA を宣言する

**テストで確かめる値**

- `IS_BETA` → `true`（値）
- `IS_BETA` の型 → `true`（true だけを表す型）

**ヒント 1 日本語の手順**

```ts
// 定数 IS_BETA を作り、true を入れる。型は書かない。ほかのファイルから使えるようにする
```

**ヒント 2 コードへの直し方**

問3 の `IS_OPEN` のサンプルと同じ形です。`true` は `"` で囲みません。

### 問 4 定数 TAX_RATE を宣言する

**テストで確かめる値**

- `TAX_RATE` → `0.1`（値）
- `TAX_RATE` の型 → `0.1`（小数もそのまま型になる）

**ヒント 1 日本語の手順**

```ts
// 定数 TAX_RATE を作り、0.1 を入れる。型は書かない。ほかのファイルから使えるようにする
```

**ヒント 2 コードへの直し方**

問1 と同じ形です。小数も整数と同じように書けます。

### 問 5 2 倍の数を返す

**テストで確かめる値**

- `double(4)` → `8`
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `number`（推論でこの型になればよい）

**ヒント 1 日本語の手順**

```ts
// 関数 double を作る。n（number）を受け取る。戻り値の型は書かない
export function double() {
  // n に 2 を掛けた数を返す
}
```

**ヒント 2 コードへの直し方**

「n（number）を受け取る」は、かっこの中に `n: number` と書きます。問5 の `withShipping` のサンプルと同じ形です。

### 問 6 数値を文字列にする

**テストで確かめる値**

- `toText(42)` → `"42"`
- `toText(-1.5)` → `"-1.5"`（負の数や小数もそのまま）
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `string`

**ヒント 1 日本語の手順**

```ts
// 関数 toText を作る。n（number）を受け取る。戻り値の型は書かない
export function toText() {
  // n を文字列にしたものを返す
}
```

**ヒント 2 コードへの直し方**

「文字列にする」は、q01 の問12 で出た `String()` です。

### 問 7 0 なら true を返す

**テストで確かめる値**

- `isZero(0)` → `true`
- `isZero(3)` → `false`
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `boolean`

**ヒント 1 日本語の手順**

```ts
// 関数 isZero を作る。n（number）を受け取る。戻り値の型は書かない
export function isZero() {
  // n が 0 と等しいか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「等しいか」は `===` です。比べた結果をそのまま返せるので、`if` は要りません。

### 問 8 正なら "plus"、負なら "minus"、0 なら "zero" を返す

**テストで確かめる値**

- `sign(5)` → `"plus"`
- `sign(-3)` → `"minus"`
- `sign(0)` → `"zero"`
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `"plus" | "minus" | "zero"`（3 つのどれか）

**ヒント 1 日本語の手順**

```ts
// 関数 sign を作る。n（number）を受け取る。戻り値の型は書かない
export function sign() {
  // もし n が 0 より大きいなら
  //   "plus" を返す
  // もし n が 0 より小さいなら
  //   "minus" を返す
  // "zero" を返す
}
```

**ヒント 2 コードへの直し方**

問8 の `sizeLabel` のサンプルに、`if` をもう 1 つ足した形です。「より大きい」は `>`、「より小さい」は `<` です。

### 問 9 60 点以上なら "合格"、それ未満なら "不合格" を返す

**テストで確かめる値**

- `judge(60)` → `"合格"`（ちょうど 60 点は合格）
- `judge(59)` → `"不合格"`
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `"合格" | "不合格"`

**ヒント 1 日本語の手順**

```ts
// 関数 judge を作る。score（number）を受け取る。戻り値の型は書かない
export function judge() {
  // score が 60 以上なら "合格"、そうでなければ "不合格" を返す
}
```

**ヒント 2 コードへの直し方**

「〜なら A、そうでなければ B を返す」は、q01 の問12 で出た条件演算子 `? :` です。条件演算子で 2 つの文字列のどちらかを返しても、戻り値は `"合格" | "不合格"` に推論されます。

### 問 10 2 乗した数を返す

**テストで確かめる値**

- `square(5)` → `25`
- `square(-3)` → `9`（-3 × -3）
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `number`

**ヒント 1 日本語の手順**

```ts
// 関数 square を作る。n（number）を受け取る。戻り値の型は書かない
export function square() {
  // n に n を掛けた数を返す
}
```

**ヒント 2 コードへの直し方**

問5 と同じ形で、掛ける数が 2 から `n` に変わります。

### 問 11 2 つの単語を半角スペースでつなぐ

**テストで確かめる値**

- `joinWords("Hello", "World")` → `"Hello World"`
- 引数の型 → `string` と `string`（引数は 2 つ）
- 戻り値の型 → `string`

**ヒント 1 日本語の手順**

```ts
// 関数 joinWords を作る。a（string）と b（string）を受け取る。戻り値の型は書かない
export function joinWords() {
  // a と b を埋め込んだ「◯ ◯」の文字列を返す
}
```

**ヒント 2 コードへの直し方**

「埋め込んだ文字列」は、q01 の問3 で出たテンプレートリテラルです。2 つの `${ }` の間に半角スペースを 1 つ書きます。引数が 2 つのときは、かっこの中を `,` で区切ります。

### 問 12 偶数なら半分にした数を、奇数なら undefined を返す

**テストで確かめる値**

- `halfIfEven(8)` → `4`
- `halfIfEven(7)` → `undefined`（奇数）
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `number | undefined`（数か、undefined）

**ヒント 1 日本語の手順**

```ts
// 関数 halfIfEven を作る。n（number）を受け取る。戻り値の型は書かない
export function halfIfEven() {
  // もし n を 2 で割った余りが 0 と等しいなら
  //   n ÷ 2 を返す
  // undefined を返す
}
```

**ヒント 2 コードへの直し方**

問12 の `pointOf` のサンプルと同じ形です。「2 で割った余り」は `% 2` です。

### 問 13 0〜11 時なら "午前"、12〜23 時なら "午後" を返す

**テストで確かめる値**

- `ampm(0)` → `"午前"`
- `ampm(11)` → `"午前"`
- `ampm(13)` → `"午後"`
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `"午前" | "午後"`

**ヒント 1 日本語の手順**

```ts
// 関数 ampm を作る。hour（number）を受け取る。戻り値の型は書かない
export function ampm() {
  // hour が 12 より小さいなら "午前"、そうでなければ "午後" を返す
}
```

**ヒント 2 コードへの直し方**

問9 と同じ形です。「より小さい」は `<` です。

### 問 14 2 つの数のうち大きい方を返す

**テストで確かめる値**

- `bigger(3, 8)` → `8`
- `bigger(9, 2)` → `9`
- 引数の型 → `number` と `number`（引数は 2 つ）
- 戻り値の型 → `number`

**ヒント 1 日本語の手順**

```ts
// 関数 bigger を作る。a（number）と b（number）を受け取る。戻り値の型は書かない
export function bigger() {
  // a が b より大きいなら a、そうでなければ b を返す
}
```

**ヒント 2 コードへの直し方**

問9 と同じ条件演算子の形です。返すのは引数の数なので、戻り値は `number` に推論されます。

### 問 15 文字数を返す

**テストで確かめる値**

- `charCount("TypeScript")` → `10`
- `charCount("")` → `0`（空の文字列）
- 引数の型 → `string`（引数は 1 つ）
- 戻り値の型 → `number`

**ヒント 1 日本語の手順**

```ts
// 関数 charCount を作る。text（string）を受け取る。戻り値の型は書かない
export function charCount() {
  // text の文字数を返す
}
```

**ヒント 2 コードへの直し方**

「文字数」は、q02 の問13 で出た `.length` です。

### 問 16 空の文字列なら true を返す

**テストで確かめる値**

- `isEmptyText("")` → `true`
- `isEmptyText(" ")` → `false`（スペース 1 文字）
- 引数の型 → `string`（引数は 1 つ）
- 戻り値の型 → `boolean`

**ヒント 1 日本語の手順**

```ts
// 関数 isEmptyText を作る。text（string）を受け取る。戻り値の型は書かない
export function isEmptyText() {
  // text が空の文字列と等しいか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

問7 と同じ形です。空の文字列は `""` と書きます。

### 問 17 true なら "はい"、false なら "いいえ" を返す

**テストで確かめる値**

- `yesNo(true)` → `"はい"`
- `yesNo(false)` → `"いいえ"`
- 引数の型 → `boolean`（引数は 1 つ）
- 戻り値の型 → `"はい" | "いいえ"`

**ヒント 1 日本語の手順**

```ts
// 関数 yesNo を作る。flag（boolean）を受け取る。戻り値の型は書かない
export function yesNo() {
  // flag が true なら "はい"、そうでなければ "いいえ" を返す
}
```

**ヒント 2 コードへの直し方**

問9 と同じ条件演算子の形です。「flag が true なら」は、q01 の問15 と同じく `flag` とだけ書きます。

### 問 18 次の年を返す

**テストで確かめる値**

- `nextYear(2026)` → `2027`
- 引数の型 → `number`（引数は 1 つ）
- 戻り値の型 → `number`

**ヒント 1 日本語の手順**

```ts
// 関数 nextYear を作る。year（number）を受け取る。戻り値の型は書かない
export function nextYear() {
  // year に 1 を足した数を返す
}
```

**ヒント 2 コードへの直し方**

問5 の `withShipping` のサンプルと同じ形で、足す数が 1 になります。

### 問 19 文字列を丸かっこ「()」で囲む

**テストで確かめる値**

- `wrapParen("注")` → `"(注)"`
- `wrapParen("")` → `"()"`（空の文字列）
- 引数の型 → `string`（引数は 1 つ）
- 戻り値の型 → `string`

**ヒント 1 日本語の手順**

```ts
// 関数 wrapParen を作る。text（string）を受け取る。戻り値の型は書かない
export function wrapParen() {
  // text を埋め込んだ「(◯)」の文字列を返す
}
```

**ヒント 2 コードへの直し方**

問11 と同じく、テンプレートリテラルで作ります。かっこは半角の `(` と `)` です。

### 問 20 最初の文字を取り出して返す

**テストで確かめる値**

- `firstChar("abc")` → `"a"`
- `firstChar("")` → `undefined`（空の文字列）
- 引数の型 → `string`（引数は 1 つ）
- 戻り値の型 → `string | undefined`

**ヒント 1 日本語の手順**

```ts
// 関数 firstChar を作る。text（string）を受け取る。戻り値の型は書かない
export function firstChar() {
  // text の 0 番目の文字を返す
}
```

**ヒント 2 コードへの直し方**

「0 番目の文字」は、問20 の `head` のサンプルと同じく `[0]` です。空の文字列の場合を別に書く必要はありません。

### 応用（総合） BMI を計算する 2 つの関数

**テストで確かめる値**

- `calcBmi(170, 65)` → `22.5`
- `calcBmi(160, 45)` → `17.6`
- `calcBmi(180, 90)` → `27.8`
- `bmiReport(160, 45)` → `"BMI 17.6（低体重）"`
- `bmiReport(200, 74)` → `"BMI 18.5（普通体重）"`（ちょうど 18.5 は普通体重）
- `bmiReport(170, 65)` → `"BMI 22.5（普通体重）"`
- `bmiReport(200, 100)` → `"BMI 25.0（肥満）"`（25 も小数第 1 位まで表示）
- `bmiReport(180, 90)` → `"BMI 27.8（肥満）"`
- 引数の型（2 つとも） → `number` と `number`
- 戻り値の型 → `number` と `string`（calcBmi は number、bmiReport は string）

**ヒント 1 日本語の手順**

```ts
// 関数 calcBmi を作る。heightCm（number）と weightKg（number）を受け取る。戻り値の型は書かない
export function calcBmi() {
  // 身長 heightM を作り、heightCm ÷ 100 を入れる
  // bmi を作り、weightKg ÷ (heightM × heightM) を入れる
  // bmi × 10 を四捨五入し、10 で割った数を返す
}

// 関数 bmiReport を作る。heightCm（number）と weightKg（number）を受け取る。戻り値の型は書かない
export function bmiReport() {
  // bmi を作り、calcBmi に heightCm と weightKg を渡して呼んだ結果を入れる
  // 判定 label を入れ直せる変数として作り、"肥満" を入れる
  // もし bmi が 18.5 より小さいなら
  //   label に "低体重" を入れ直す
  // そうでなく、もし bmi が 25 より小さいなら
  //   label に "普通体重" を入れ直す
  // bmi を小数第 1 位までの文字列にしたものと label を埋め込んだ「BMI ◯（◯）」の文字列を返す
}
```

**ヒント 2 コードへの直し方**

「四捨五入する」は `Math.round()` です。10 を掛けてから四捨五入し、10 で割ると、小数第 1 位で丸められます。「そうでなく、もし」は `else if`、「小数第 1 位までの文字列」は `.toFixed(1)` です。説明のコメントは、引数の型注釈を実際に消してエラーを見てから書きます。
