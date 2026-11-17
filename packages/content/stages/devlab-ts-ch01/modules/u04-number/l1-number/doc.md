---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
---

# レッスン4-1 number型

## このレッスンの目標

- [ ] 引数と戻り値に型注釈を書き、計算の道具を選べる
- [ ] エラーで処理を止める場面と、真偽値の反転を説明できる
- [ ] 整数の取り出しと、NaN・有限の数・整数の確認ができる

## 4-1-1 計算の道具

> **型注釈で数の入口と出口を決め、目的に合う計算の道具を選べます。**

number は数値の型で、整数も小数も表します。
q04 のスターターには関数名だけがあります。
引数と戻り値の型注釈は自分で書きます。
かっこの中の `: number` は受け取る値、かっこの後ろは返す値の型です。
文字列を受け取るなら string、真偽値を返すなら boolean を書きます。

```ts
// 送料を足す関数を作り、数値の price を受け取り数値を返す
export function addShipping(price: number): number {
  // price に 500 を足した数を返す
  return price + 500;
  // 関数の中身はここまで
}
// 送料込みの金額を表示する
console.log(addShipping(1200));
// 結果: 1700
```

### ゼロからの距離

絶対値は、数直線でゼロからどれだけ離れているかを表す数です。
Math.abs は負の数を正にし、正の数とゼロはそのまま返します。
在庫が予定より3個少ないとき、差は -3 ですが、その大きさは3です。

```ts
// ずれ gap を作り、-3 の絶対値を入れる
const gap = Math.abs(-3);
// ずれを表示する
console.log(gap);
// 結果: 3
```

### 同じ数を掛ける計算と、その逆

累乗は同じ数を繰り返し掛ける計算です。
`2 ** 10` は2を10個掛ける計算で、1024 になります。
ここでは右側に0以上の整数を使います。0乗は1です。
平方根は、二乗すると元の数になる数です。
Math.sqrt は0以上の平方根を返します。49 なら7です。
2の平方根のように、結果が小数になる場合もあります。

```ts
// 容量 capacity を作り、2 の 10 乗を入れる
const capacity = 2 ** 10;
// 正方形の棚の一辺 side に、49 の平方根を入れる
const side = Math.sqrt(49);
// 容量と一辺を表示する
console.log(capacity, side);
// 結果: 1024 7
```

Math.hypot は、渡した数をそれぞれ二乗して足した数の平方根を返します。
棚の横と縦から、対角線という斜めの長さを求める例です。
6の二乗と8の二乗を足すと100で、その平方根は10です。

```ts
// 棚の横 width を作り、6 を入れる
const width = 6;
// 棚の縦 height を作り、8 を入れる
const height = 8;
// 対角線 diagonal に、横と縦から求めた斜めの長さを入れる
const diagonal = Math.hypot(width, height);
// 対角線を表示する
console.log(diagonal);
// 結果: 10
```

### 下限と上限を守る

Math.min は渡した数のうち最小の数、Math.max は最大の数を返します。
3個以上の数も、かっこの中にカンマで区切って並べられます。
`Math.min(3, 9, 2)` は2、`Math.max(3, 9, 2)` は9です。

予約数を1席以上4席以下に収める例です。
まず Math.max で1より下にしません。
次に Math.min で4より上にしません。
希望が範囲内なら、その数がそのまま残ります。

```ts
// 仮の予約数 requested を作り、5 を入れる
const requested = 5;
// 最低 1 席になるよう、lower に大きい方を入れる
const lower = Math.max(requested, 1);
// 最大 4 席になるよう、seats に小さい方を入れる
const seats = Math.min(lower, 4);
// 予約する席数を表示する
console.log(seats);
// 結果: 4
```

よくある間違いは、上限にも Math.max を使うことです。
`Math.max(5, 4)` は5なので、4以下にはなりません。
また、`**` は掛け算の `*` とは別です。`2 * 10` は20になります。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と業務の例は教材用に独自作成しています。

## 4-1-2 エラーを投げる

> **受け付けない値は throw new Error で止め、! で条件を反対にできます。**

受け付けない値が届いたとき、処理を続けると困る場合があります。
`throw new Error("メッセージ")` は、その場で処理を止めてエラーを知らせます。
`new` は新しく作る印で、`new Error` はエラーを一つ作ります。
`throw` はそのエラーを投げる印です。引用符の中に理由を書きます。
エラーを投げた呼び出しは、普通の戻り値を返しません。
エラーを受け止める書き方は、このあと学びます。

```ts
// 人数を受け取り、確認した人数を返す関数を作る
export function checkGuests(guests: number): number {
  // もし人数が 0 より小さいなら
  if (guests < 0) {
    // 人数の誤りを知らせるエラーを投げる
    throw new Error("人数は 0 以上にしてください");
    // 条件の中身はここまで
  }
  // 人数を返す
  return guests;
  // 関数の中身はここまで
}
// 確認した人数を表示する
console.log(checkGuests(3));
// 結果: 3
```

`checkGuests(-1)` はエラーを投げ、下の `return guests` には進みません。
一方、`checkGuests(3)` は条件に合わず、3を返します。

`!` は真偽値の true と false を反対にする記号です。
真偽値は「はい」か「いいえ」を表す値です。
条件の前に付けると「そうでない」を表せます。

```ts
// 支払済み isPaid を作り、true を入れる
const isPaid = true;
// 未払い isUnpaid を作り、isPaid の反対を入れる
const isUnpaid = !isPaid;
// false の反対を other に入れる
const other = !false;
// 未払いかと、false の反対を表示する
console.log(isUnpaid, other);
// 結果: false true
```

よくある間違いは、エラーの代わりにメッセージの文字列を return することです。
数値を返す関数では型のエラーになり、エラーを投げる動作にもなりません。
`throw new Error` の形をまとめて使いましょう。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と業務の例は教材用に独自作成しています。

## 4-1-3 文字列から数を取り出す

> **文字列から整数を取り出し、NaN・有限の数・整数を区別できます。**

Number.parseInt は、文字列の先頭から整数として読める部分を取り出します。
数字の後に別の文字があると、そこで止まります。
小数点でも止まるので、`Number.parseInt("2.5個", 10)` は2です。
二つ目の10は、十進数で読む指定です。
十進数は、普段使う0から9の数字で数を表す方法です。いつも10を付けておきます。
先頭の空白や符号は読めます。`"-15℃"` からは -15 が取り出せます。

```ts
// 注文数 quantity に、先頭の整数を入れる
const quantity = Number.parseInt("12個", 10);
// 注文数を表示する
console.log(quantity);
// 結果: 12
```

NaN は数にできないことを表す、number 型の特別な値です。
`"約3"` や `"なし"` からは先頭の整数を読めず、NaN になります。
Number.isNaN は NaN のときだけ true を返します。

```ts
// 数 count を作り、読めない入力から取り出した結果を入れる
const count = Number.parseInt("なし", 10);
// 取り出せなかったかを failed に入れる
const failed = Number.isNaN(count);
// 数と、取り出せなかったかを表示する
console.log(count, failed);
// 結果: NaN true
```

よくある間違いは、`count === NaN` で調べることです。
NaN は自分自身とも等しくならず、この比較はいつも false です。
必ず Number.isNaN を使います。

### 有限の数と整数

Infinity は無限大を表す、number 型の特別な値です。
正の数を0で割ると Infinity、負の数を0で割ると -Infinity になります。
Number.isFinite は、NaN でも正負の Infinity でもない数なら true です。
「有限」は、無限大でない数を表す言葉です。
小数も有限の数に含まれます。

```ts
// 一個の金額 unitPrice に、1000 を 0 で割った数を入れる
const unitPrice = 1000 / 0;
// 有限の数かを valid に入れる
const valid = Number.isFinite(unitPrice);
// 小数の金額が有限かを normal に入れる
const normal = Number.isFinite(1.5);
// 金額と、それぞれ有限かを表示する
console.log(unitPrice, valid, normal);
// 結果: Infinity false true
```

Number.isInteger は整数かを調べます。
3や0は true、2.5は false です。
NaN や正負の Infinity も整数ではないので false です。
`!` を付けると「整数でない」を表せます。

```ts
// 注文数 quantity を作り、2.5 を入れる
const quantity = 2.5;
// 整数かを whole に入れる
const whole = Number.isInteger(quantity);
// 整数でないかを invalid に入れる
const invalid = !whole;
// 整数かと、整数でないかを表示する
console.log(whole, invalid);
// 結果: false true
```

よくある間違いは、number 型なら必ず整数や有限の数だと考えることです。
型だけでなく、必要な条件も調べましょう。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と業務の例は教材用に独自作成しています。

## 問題ごとのヒント

引数と戻り値の型も自分で書きます。以下は答えの処理を含まない骨組みです。

### 問 1 小数点以下を四捨五入する

**テストで確かめる値**

- `roundOff(2.5)`：`3`
- `roundOff(2.4)`：`2`

**ヒント 1 日本語の手順**

```ts
// 関数 roundOff を作る。数値の n を受け取り、数値を返す
export function roundOff() {
  // n を四捨五入した数を返す
}
```

**ヒント 2 コードへの直し方**

1 行目の「◯ を受け取り、◯ を返す」は、かっこの中に引数と型を、かっこの後ろに戻り値の型を書きます。四捨五入は、q01 の問13 で出た `Math.round()` です。

### 問 2 1 の位を切り捨てる（10 の倍数にする）

**テストで確かめる値**

- `floorTo10(123)`：`120`
- `floorTo10(9)`：`0`（10 より小さいと 0）

**ヒント 1 日本語の手順**

```ts
// 関数 floorTo10 を作る。数値の n を受け取り、数値を返す
export function floorTo10() {
  // n ÷ 10 を切り捨て、10 を掛けた数を返す
}
```

**ヒント 2 コードへの直し方**

q01 の問2（100 円単位の切り上げ）と同じ考え方です。切り捨ては `Math.floor()` です。

### 問 3 100 の倍数に切り上げる

**テストで確かめる値**

- `ceilTo100(101)`：`200`
- `ceilTo100(100)`：`100`（100 の倍数はそのまま）

**ヒント 1 日本語の手順**

```ts
// 関数 ceilTo100 を作る。数値の n を受け取り、数値を返す
export function ceilTo100() {
  // n ÷ 100 を切り上げ、100 を掛けた数を返す
}
```

**ヒント 2 コードへの直し方**

問2 の切り捨てを、切り上げの `Math.ceil()` に変える形です。

### 問 4 2 つの数の差の大きさ（絶対値）を返す

**テストで確かめる値**

- `absDiff(3, 10)`：`7`
- `absDiff(10, 3)`：`7`（順番を入れ替えても同じ）

**ヒント 1 日本語の手順**

```ts
// 関数 absDiff を作る。数値の a と数値の b を受け取り、数値を返す
export function absDiff() {
  // a から b を引いた数の絶対値を返す
}
```

**ヒント 2 コードへの直し方**

絶対値は `Math.abs()` です。問4 のサンプルの `gap` の行と同じ形です。

### 問 5 a を b で割った余りを返す

**テストで確かめる値**

- `remainder(10, 3)`：`1`
- `remainder(9, 3)`：`0`（割り切れると 0）

**ヒント 1 日本語の手順**

```ts
// 関数 remainder を作る。数値の a と数値の b を受け取り、数値を返す
export function remainder() {
  // a を b で割った余りを返す
}
```

**ヒント 2 コードへの直し方**

余りは、q01 の問3 で出た `%` です。

### 問 6 n が base の倍数なら true を返す

**テストで確かめる値**

- `isMultipleOf(12, 4)`：`true`（12 は 4 の倍数）
- `isMultipleOf(10, 4)`：`false`

**ヒント 1 日本語の手順**

```ts
// 関数 isMultipleOf を作る。数値の n と数値の base を受け取り、true か false を返す
export function isMultipleOf() {
  // n を base で割った余りが 0 と等しいか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「true か false を返す」は `boolean` です。比べた結果はそのまま true か false なので、`if` を使わずに、`return` の後ろに比べる式を書けます。

### 問 7 3 乗した数を返す

**テストで確かめる値**

- `cube(3)`：`27`（3 × 3 × 3）
- `cube(-2)`：`-8`（(-2) × (-2) × (-2)）

**ヒント 1 日本語の手順**

```ts
// 関数 cube を作る。数値の n を受け取り、数値を返す
export function cube() {
  // n の 3 乗を返す
}
```

**ヒント 2 コードへの直し方**

「n の 3 乗」は `**` を使います。問7 のサンプルの `kilo` の行と同じ形です。

### 問 8 平方根を返す。負の数ならエラーを投げる

**テストで確かめる値**

- `squareRoot(9)`：`3`
- `squareRoot(2)`：`1.41421…`（1.41421 にほぼ等しければよい）
- `squareRoot(-1)`：エラーを投げる

**ヒント 1 日本語の手順**

```ts
// 関数 squareRoot を作る。数値の n を受け取り、数値を返す
export function squareRoot() {
  // もし n が 0 より小さいなら
  //   "負の数の平方根は求められません" というメッセージのエラーを投げる
  // n の平方根を返す
}
```

**ヒント 2 コードへの直し方**

問8 の `checkQuantity` のサンプルと同じ形です。平方根は `Math.sqrt()` です。メッセージの文は自由です。

### 問 9 value を min 以上 max 以下に収める

**テストで確かめる値**

- `clamp(15, 0, 10)`：`10`（大きすぎるので max）
- `clamp(-5, 0, 10)`：`0`（小さすぎるので min）
- `clamp(5, 0, 10)`：`5`（範囲の中なのでそのまま）

**ヒント 1 日本語の手順**

```ts
// 関数 clamp を作る。数値の value、min、max を受け取り、数値を返す
export function clamp() {
  // value と min の大きい方を求め、それと max の小さい方を返す
}
```

**ヒント 2 コードへの直し方**

「大きい方」は `Math.max()`、「小さい方」は `Math.min()` です。`Math.max()` を呼んだ結果を、そのまま `Math.min()` のかっこの中に書けます。`if` で書いてもかまいません。

### 問 10 小数第 1 位までの文字列にする

**テストで確かめる値**

- `toFixed1(3.14159)`：`"3.1"`（文字列）
- `toFixed1(2)`：`"2.0"`

**ヒント 1 日本語の手順**

```ts
// 関数 toFixed1 を作る。数値の n を受け取り、文字列を返す
export function toFixed1() {
  // n を小数第 1 位までの文字列にしたものを返す
}
```

**ヒント 2 コードへの直し方**

`.toFixed(桁数)` は、数値を決めた桁数までの文字列にするメソッドです（q03 の応用で出ました）。返すのは文字列なので、戻り値の型は `string` です。

### 問 11 文字列の先頭の整数を取り出す。取り出せなければ 0

**テストで確かめる値**

- `parseIntOrZero("42px")`：`42`
- `parseIntOrZero("abc")`：`0`（取り出せない）
- `parseIntOrZero("-7")`：`-7`（マイナスも取り出せる）

**ヒント 1 日本語の手順**

```ts
// 関数 parseIntOrZero を作る。文字列の text を受け取り、数値を返す
export function parseIntOrZero() {
  // 数 n を作り、text の先頭の整数を 10 進数で取り出した数を入れる
  // n が NaN なら 0、そうでなければ n を返す
}
```

**ヒント 2 コードへの直し方**

1 行目の中身は、問11 のサンプルの `amount` の行と同じ形です。最後の行は、q01 の問12 で出た「〜なら A、そうでなければ B」の条件演算子 `? :` で書けます。

### 問 12 NaN でも Infinity でもない数なら true を返す

**テストで確かめる値**

- `isFiniteNumber(1.5)`：`true`
- `isFiniteNumber(NaN)`：`false`
- `isFiniteNumber(-Infinity)`：`false`（マイナスの無限大）

**ヒント 1 日本語の手順**

```ts
// 関数 isFiniteNumber を作る。数値の n を受け取り、true か false を返す
export function isFiniteNumber() {
  // n が有限の数か（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「有限の数か」は `Number.isFinite()` です。問12 のサンプルの `isValid` の行と同じ形です。

### 問 13 part が total の何パーセントかを、整数に四捨五入して返す

**テストで確かめる値**

- `percentOf(1, 3)`：`33`
- `percentOf(2, 3)`：`67`（66.66… を四捨五入）
- `percentOf(5, 5)`：`100`

**ヒント 1 日本語の手順**

```ts
// 関数 percentOf を作る。数値の part と数値の total を受け取り、数値を返す
export function percentOf() {
  // part ÷ total × 100 を四捨五入した数を返す
}
```

**ヒント 2 コードへの直し方**

÷ は `/`、× は `*`、四捨五入は `Math.round()` です。割り算と掛け算は左から順に計算されます。

### 問 14 2 つの数の平均を返す

**テストで確かめる値**

- `average2(3, 8)`：`5.5`
- `average2(-2, 2)`：`0`

**ヒント 1 日本語の手順**

```ts
// 関数 average2 を作る。数値の a と数値の b を受け取り、数値を返す
export function average2() {
  // a と b を足して 2 で割った数を返す
}
```

**ヒント 2 コードへの直し方**

q01 の問4 と同じく、足し算を先にします。1 行で書くなら、足し算をかっこ `( )` で囲みます。

### 問 15 分を秒に変える

**テストで確かめる値**

- `minutesToSeconds(1.5)`：`90`（1 分 30 秒）
- `minutesToSeconds(0)`：`0`

**ヒント 1 日本語の手順**

```ts
// 関数 minutesToSeconds を作る。数値の minutes を受け取り、数値を返す
export function minutesToSeconds() {
  // minutes に 60 を掛けた数を返す
}
```

**ヒント 2 コードへの直し方**

× は `*` です。

### 問 16 km を m に変える

**テストで確かめる値**

- `kmToMeters(1.5)`：`1500`
- `kmToMeters(42.195)`：`42195`（フルマラソンの距離）

**ヒント 1 日本語の手順**

```ts
// 関数 kmToMeters を作る。数値の km を受け取り、数値を返す
export function kmToMeters() {
  // km に 1000 を掛けた数を返す
}
```

**ヒント 2 コードへの直し方**

問15 と同じ形です。掛ける数が 1000 になります。

### 問 17 直角三角形の 2 辺から、斜辺の長さを返す

**テストで確かめる値**

- `hypotenuse(3, 4)`：`5`
- `hypotenuse(5, 12)`：`13`

**ヒント 1 日本語の手順**

```ts
// 関数 hypotenuse を作る。数値の a と数値の b を受け取り、数値を返す
export function hypotenuse() {
  // a と b から斜めの長さを求めて返す
}
```

**ヒント 2 コードへの直し方**

「斜めの長さを求める」は、問17 のサンプルの `diagonal` の行と同じ `Math.hypot()` です。`Math.sqrt()` を使うなら、a × a + b × b の平方根です。

### 問 18 0 以上の整数の桁数を返す

**テストで確かめる値**

- `digitCount(12345)`：`5`
- `digitCount(0)`：`1`

**ヒント 1 日本語の手順**

```ts
// 関数 digitCount を作る。数値の n を受け取り、数値を返す
export function digitCount() {
  // n を文字列にしたものの長さを返す
}
```

**ヒント 2 コードへの直し方**

文字列にするのは q01 の問12 で出た `String()`、長さは q02 で出た `.length` です。12345 を文字列にすると `"12345"` で、5 文字です。

### 問 19 小数第 2 位までに四捨五入する

**テストで確かめる値**

- `roundTo2(1.234)`：`1.23`
- `roundTo2(9.876)`：`9.88`
- `roundTo2(3)`：`3`

**ヒント 1 日本語の手順**

```ts
// 関数 roundTo2 を作る。数値の n を受け取り、数値を返す
export function roundTo2() {
  // n に 100 を掛けて四捨五入し、100 で割った数を返す
}
```

**ヒント 2 コードへの直し方**

`Math.round()` は整数にしか丸められません。先に 100 を掛けて、丸めたい桁を整数の位置まで動かします。1.234 なら、100 倍で 123.4、四捨五入で 123、100 で割って 1.23 です。返すのは数値なので、`.toFixed()` は使いません。

### 問 20 華氏を摂氏に変え、小数第 1 位までに四捨五入する

**テストで確かめる値**

- `fahrenheitToCelsius(98.6)`：`37`
- `fahrenheitToCelsius(212)`：`100`（水が沸く温度）
- `fahrenheitToCelsius(50)`：`10`

**ヒント 1 日本語の手順**

```ts
// 関数 fahrenheitToCelsius を作る。数値の fahrenheit を受け取り、数値を返す
export function fahrenheitToCelsius() {
  // 摂氏 celsius を作り、(fahrenheit − 32) × 5 ÷ 9 を入れる
  // celsius に 10 を掛けて四捨五入し、10 で割った数を返す
}
```

**ヒント 2 コードへの直し方**

式のかっこは、そのまま `( )` で書きます。− は `-` です。2 行目は問19 と同じ形で、掛ける数と割る数が 10 になります。

### 応用（総合） 指定した桁までに四捨五入する関数と、パーセントを返す関数

**テストで確かめる値**

- `roundTo(3.14159, 2)`：`3.14`
- `roundTo(1234.5678, 1)`：`1234.6`
- `roundTo(2.5, 0)`：`3`（小数第 0 位は整数）
- `roundTo(10, 3)`：`10`
- `roundTo(NaN, 2)`：エラーを投げる（Infinity のときも）
- `roundTo(1, 1.5)`：エラーを投げる（digits が整数でない）
- `roundTo(1, -1)`：エラーを投げる（digits が 0 より小さい）
- `roundTo(1, 11)`：エラーを投げる（digits が 10 より大きい）
- `percent(1, 3)`：`33.3`
- `percent(2, 3)`：`66.7`
- `percent(5, 5)`：`100`
- `percent(0, 8)`：`0`
- `percent(1, 0)`：エラーを投げる（total が 0）

**ヒント 1 日本語の手順**

```ts
// 関数 roundTo を作る。数値の value と数値の digits を受け取り、数値を返す
export function roundTo() {
  // もし value が有限の数でないなら
  //   "value は有限の数にしてください" というメッセージのエラーを投げる
  // もし digits が整数でない、または digits が 0 より小さい、または digits が 10 より大きいなら
  //   "digits は 0〜10 の整数にしてください" というメッセージのエラーを投げる
  // 倍率 scale を作り、10 の digits 乗を入れる
  // value に scale を掛けて四捨五入し、scale で割った数を返す
}

// 関数 percent を作る。数値の part と数値の total を受け取り、数値を返す
export function percent() {
  // もし total が 0 と等しいなら
  //   "total に 0 は使えません" というメッセージのエラーを投げる
  // part ÷ total × 100 を、roundTo で小数第 1 位までにした数を返す
}
```

**ヒント 2 コードへの直し方**

「有限の数でない」「整数でない」は、`Number.isFinite()` や `Number.isInteger()` の前に `!` を付けます。「または」は `||`、「10 の digits 乗」は `**` です。最後の行は問19 と同じ考え方で、100 の代わりに `scale` を使います。`percent` の中では、自分で作った `roundTo` を呼びます（q01 の問20）。メッセージの文は自由です。

