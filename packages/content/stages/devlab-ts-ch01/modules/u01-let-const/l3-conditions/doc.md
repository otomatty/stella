---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-statements-if-else, SRC-typescriptbook-functions-function-declaration]
---

# レッスン1-3 条件を確かめ、関数を組み立てる

## このレッスンの目標

- [ ] while の条件と更新を追い、引数を写す理由を説明できる
- [ ] 条件で値を選び、文字列への変換と四捨五入の結果を説明できる
- [ ] 小さな関数を作って呼び、計算を順番に組み立てられる

## 1-3-1 回数の決まらないくり返し

> **while は条件を先に確かめ、true の間だけ値を変えながらくり返します。**

`while` は、条件が成り立つ間くり返す書き方です。
在庫が残る間だけ発送する仕事のように、回数を条件で決められます。
中身を実行する前に、毎回条件を確かめます。

`>` は「より大きい」です。同じ値は含みません。
`1 > 0` は `true`、`0 > 0` は `false` です。
引数を変えたいときは、`let` の別の変数に写します。
課題では、引数そのものに値を入れ直すと lint でエラーです。
この決まりを `no-param-reassign` と呼びます。

```ts
// 関数 ship を作る。在庫 quantity を受け取り、発送後の残りを返す
function ship(quantity: number): number {
  // 残り rest を入れ直せる変数として作り、引数 quantity を写す
  let rest = quantity;
  // rest が 0 より大きい間くり返す
  while (rest > 0) {
    // rest を 1 減らす
    rest--;
    // くり返す中身はここまで
  }
  // rest を返す
  return rest;
  // 関数の中身はここまで
}
// 在庫が 2 個のときの残りを表示する
console.log(ship(2));
// 結果: 0
```

| 中身の前の rest | rest > 0 | 中身のあとの rest |
| --- | --- | --- |
| 2 | true | 1 |
| 1 | true | 0 |
| 0 | false | 中身を実行せず、0 のまま |

`quantity` は受け取った値のままです。
`rest` だけが 2、1、0 と変わります。
`ship(0)` では最初から条件が `false` です。
中身を一回も実行せず、0 を返します。

よくある間違いは、条件に使う変数を変え忘れることです。
表示するだけでは値が変わらず、終わらなくなります。
中身のどこで、次の条件に使う値が変わるかを見ましょう。

`!==` は「等しくない」です。`===` の反対です。
課題では `!=` を使わず、`!==` と書きます。

```ts
// 関数 pendingLabel を作り、発送状態 status を受け取る
function pendingLabel(status: string): string {
  // もし status が完了と等しくないなら
  if (status !== "完了") {
    // 作業ありを返す
    return "作業あり";
    // 条件に合うときの中身はここまで
  }
  // 作業なしを返す
  return "作業なし";
  // 関数の中身はここまで
}
// 発送待ちのときの表示を確かめる
console.log(pendingLabel("発送待ち"));
// 結果: "作業あり"
```

`status` が `"完了"` なら、比較の結果は `false` です。
そのときは if の中身を飛ばし、`"作業なし"` を返します。
数でも同じように、目標の値と等しくないかを比べられます。
問11では桁を減らし、問17では数を変えながら回数を数えます。
問18では、二つの数と余りを順に入れ替えます。
どれも「最初の値」「続ける条件」「中の更新」を分けて考えましょう。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)・[if-else文](https://typescriptbook.jp/reference/statements/if-else)。変数・数値・条件の概念を参照しています。while の動きと発送の例は、書き方ガイドを素材に教材用に独自作成しています。

## 1-3-2 条件で選ぶ

> **条件で値を選び、文字列への変換や四捨五入をして返せます。**

`boolean` は、真を表す `true` と偽を表す `false` だけの型です。
会員かどうか、予約できるか、といった二通りの状態を表せます。
比べた結果もこの型なので、条件にそのまま書けます。

`||` は「または」です。ここでは二つの boolean の条件をつなぎます。
どちらかが `true` なら、全体も `true` になります。

```ts
// 関数 canReserve を作る。会員か、招待客かを受け取る
function canReserve(member: boolean, guest: boolean): boolean {
  // member または guest が true なら true を返す
  return member || guest;
  // 関数の中身はここまで
}
// 招待客が予約できるかを表示する
console.log(canReserve(false, true));
// 結果: true
```

| member | guest | member \|\| guest |
| --- | --- | --- |
| true | true | true |
| true | false | true |
| false | true | true |
| false | false | false |

`member === true` のような余分な比較は、課題の lint でエラーです。
`member` だけで書きます。

`条件 ? A : B` を「条件演算子」と呼びます。
条件が `true` なら A、`false` なら B を選びます。
全体で一つの値になるので、変数に入れたり返したりできます。
`String()` は、値を文字列に変える関数です。

```ts
// 関数 receptionLabel を作る。会員かどうかと受付番号を受け取る
function receptionLabel(member: boolean, code: number): string {
  // 会員なら特典あり、そうでなければ code を文字列にしたものを返す
  return member ? "特典あり" : String(code);
  // 関数の中身はここまで
}
// 非会員の受付番号を表示する
console.log(receptionLabel(false, 42));
// 結果: "42"（数値ではなく文字列）
```

`receptionLabel(true, 42)` は `"特典あり"` です。
よくある間違いは、戻り値が `string` なのに数値を返すことです。
この例で `String(code)` を `code` に変えると、型の確認が通りません。

`Math.round()` は、数値を整数に四捨五入します。
ここでは 0 以上の数を扱います。
小数部分が 0.5 未満なら小さい整数に、0.5 以上なら大きい整数にします。

```ts
// 点数 score を作り、2.4 を四捨五入した数を入れる
const score = Math.round(2.4);
// 評価 rating を作り、2.5 を四捨五入した数を入れる
const rating = Math.round(2.5);
// 点数と評価を表示する
console.log(score, rating);
// 結果: 2 3
```

| 書き方 | 2.4 | 2.5 |
| --- | --- | --- |
| Math.floor | 2 | 2 |
| Math.ceil | 3 | 3 |
| Math.round | 2 | 3 |

問12では、3 の倍数と 5 の倍数の両方に合う場合もあります。
それぞれの条件と、どちらでもない場合を分けて考えます。
問13は、その年の金額に利息を足し、最後に一度だけ四捨五入します。
`1 + rate / 100` は、割り算を先に計算します。
問14は `Math.max` を使わず、`if` で今の最大値を更新します。
問15の「金額の条件、または会員」は、`||` でつなげられます。

参考: サバイバルTypeScript [boolean型](https://typescriptbook.jp/reference/values-types-variables/boolean)・[if-else文](https://typescriptbook.jp/reference/statements/if-else)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。型と値の概念を参照しています。条件演算子・丸めの説明と予約・受付の例は、書き方ガイドを素材に独自作成しています。

## 1-3-3 関数を分けて使う

> **小さな関数に名前を付けて呼ぶと、計算や整形を順番に組み立てられます。**

「アロー関数」は、関数を短く作る書き方です。
`=>` の左で引数を受け取り、右の値を返します。
式が一つのときは、波かっこと `return` を省けます。
関数を値として作り、`const` で名前を付けます。
作るだけでは中身を実行しません。
名前の後ろにかっこを付けて呼ぶと、渡した値で実行します。

```ts
// 関数 toYen を作る。price を受け取り、円を付けた文字列を返す
const toYen = (price: number) => `${price}円`;
// 表示 label を作り、toYen に 500 を渡して呼んだ結果を入れる
const label = toYen(500);
// 表示を確かめる
console.log(label);
// 結果: "500円"
```

`function` で同じ働きを書くと、次の形です。

```ts
// 関数 toYen を作る。price を受け取り、円を付けた文字列を返す
function toYen(price: number): string {
  // price の後ろに円を付けた文字列を返す
  return `${price}円`;
  // 関数の中身はここまで
}
// 1000 を渡して呼んだ結果を表示する
console.log(toYen(1000));
// 結果: "1000円"
```

よくある間違いは、`=>` を「以上」の `>=` と取り違えることです。
`=>` は関数を作る印です。

`.padStart()` は、決めた長さに足りない分を先頭で埋めます。
注文番号をそろえるときに使えます。
一つ目の引数は仕上がりの長さ、二つ目は埋める文字です。

```ts
// 関数 orderCode を作る。n を文字列にして、前を 0 で埋めて 5 文字にする
const orderCode = (n: number) => String(n).padStart(5, "0");
// 注文番号 label を作り、orderCode に 42 を渡して呼んだ結果を入れる
const label = orderCode(42);
// 注文番号を表示する
console.log(label);
// 結果: "00042"
```

`orderCode(7)` は `"00007"` です。
`orderCode(12345)` は `"12345"`、`orderCode(123456)` も `"123456"` のままです。
指定した長さで切り落とす操作ではありません。
文字列のメソッドなので、数値には直接使えません。
`String()` で変換してから呼びます。

引き算は `-` で書きます。
残高などの計算でも、前の結果に名前を付けると順番を追えます。

```ts
// 関数 toYen を作る。price を受け取り、円を付けた文字列を返す
const toYen = (price: number) => `${price}円`;
// 入金後の残高 credited を作り、3000 と 500 を足す
const credited = 3000 + 500;
// 支払い後の残高 balance を作り、credited から 1200 を引く
const balance = credited - 1200;
// 表示 label を作り、toYen に balance を渡して呼んだ結果を入れる
const label = toYen(balance);
// 残高を表示する
console.log(label);
// 結果: "2300円"
```

二つの変数を順に入れ直すときは、元の値を消さないようにします。
たとえば、入金予定額と現在の残高を入れ替える例です。

```ts
// 残高 balance を入れ直せる変数として作り、1000 を入れる
let balance = 1000;
// 入金予定 deposit を入れ直せる変数として作り、500 を入れる
let deposit = 500;
// 元の残高 saved を作り、balance を入れる
const saved = balance;
// balance に deposit を入れ直す
balance = deposit;
// deposit に saved を入れ直す
deposit = saved;
// 入れ替えた値を表示する
console.log(balance, deposit);
// 結果: 500 1000
```

先に `balance` を変えると、元の 1000 をその名前から読めなくなります。
元の値が必要なら、入れ直す前に別の名前に控えます。
問19でも、二つの元の数から次の数を作ってから更新します。
問20では、時・分・秒を計算し、それぞれを同じ形で整えます。
アロー関数は必須ではありません。使ったら、呼ぶ場所も確かめましょう。
応用では、値引きしてから下限を確かめ、その後に送料を決めます。
順番を入れ替えると、同じ入力でも結果が変わります。

参考: サバイバルTypeScript [関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)・[letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。関数・文字列・変数の概念を参照しています。アロー関数・桁埋めと業務例は、書き方ガイドを素材に独自作成しています。

## もっと知りたい人へ

- サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)
- サバイバルTypeScript [boolean型](https://typescriptbook.jp/reference/values-types-variables/boolean)
- サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)

章の課題の q01 を一問ずつ確かめましょう。
ここからのヒントは書き方ガイドの値と日本語の手順を使っています。
「問N のサンプル」は、このまとめの対応する書き方の例に置き換えて読めます。

## 問題ごとのヒント

このレッスンの書き方で解く問題のヒントです。ほかの問題のヒントは、その書き方のレッスンにあります。

### 問 11 各桁の数字の合計を返す

**テストで確かめる値**

- `digitSum(1234)` は `10`
- `digitSum(9)` は `9`（1 桁）
- `digitSum(0)` は `0`

**ヒント 1 日本語の手順**

```ts
export function digitSum(n: number): number {
  // 残り rest を入れ直せる変数として作り、引数 n を写す
  // 合計 total を入れ直せる変数として作り、0 を入れる
  // rest が 0 より大きい間くり返す
  //   total に、rest を 10 で割った余りを足す
  //   rest ÷ 10 を切り捨てた数を、rest に入れ直す
  // total を返す
}
```

**ヒント 2 コードへの直し方**

「〜の間くり返す」は `while`、「より大きい」は `>` です。1 行目は、問11 の `addOne` のサンプルと同じく、引数を `let` の変数に写します。

### 問 12 FizzBuzz

**テストで確かめる値**

- `fizzBuzz(15)` は `"FizzBuzz"`
- `fizzBuzz(9)` は `"Fizz"`
- `fizzBuzz(10)` は `"Buzz"`
- `fizzBuzz(7)` は `"7"`（数値の 7 ではなく文字列）

**ヒント 1 日本語の手順**

```ts
export function fizzBuzz(n: number): string {
  // 文 label を入れ直せる変数として作り、空の文字列を入れる
  // もし n を 3 で割った余りが 0 と等しいなら
  //   label の後ろに "Fizz" をつなげる
  // もし n を 5 で割った余りが 0 と等しいなら
  //   label の後ろに "Buzz" をつなげる
  // label が空の文字列なら n を文字列にしたもの、そうでなければ label を返す
}
```

**ヒント 2 コードへの直し方**

最後の行は、問12 のサンプルと同じ「〜なら A、そうでなければ B」の形で、条件演算子 `? :` を使います。数値を文字列にするのは `String()` です。

### 問 13 複利で預けたときの金額を返す

**テストで確かめる値**

- `compound(10000, 10, 2)` は `12100`
- `compound(10000, 5, 3)` は `11576`（11576.25 を四捨五入）
- `compound(10000, 5, 0)` は `10000`（0 年なら元金のまま）

**ヒント 1 日本語の手順**

```ts
export function compound(principal: number, rate: number, years: number): number {
  // 金額 amount を入れ直せる変数として作り、principal を入れる
  // i を 0 から、years より小さい間 1 ずつ増やしながらくり返す
  //   amount に (1 + rate ÷ 100) を掛ける
  // amount を四捨五入した数を返す
}
```

**ヒント 2 コードへの直し方**

「掛ける」は `*=`、四捨五入は `Math.round()` です。`1 + rate / 100` は、割り算が先に計算されます。

### 問 14 3 つの数の最大値を返す

**テストで確かめる値**

- `maxOf3(3, 9, 2)` は `9`
- `maxOf3(7, 1, 5)` は `7`
- `maxOf3(-3, -2, -1)` は `-1`（負の数では -1 がいちばん大きい）

**ヒント 1 日本語の手順**

```ts
export function maxOf3(a: number, b: number, c: number): number {
  // 最大 max を入れ直せる変数として作り、a を入れる
  // もし b が max より大きいなら
  //   max に b を入れ直す
  // もし c が max より大きいなら
  //   max に c を入れ直す
  // max を返す
}
```

**ヒント 2 コードへの直し方**

「より大きい」は `>` です。`if` を 2 つ、この順に並べます。

### 問 15 送料を返す

**テストで確かめる値**

- `shippingFee(2000, false)` は `500`
- `shippingFee(3000, false)` は `0`（ちょうど 3000 円も無料）
- `shippingFee(100, true)` は `0`（会員）

**ヒント 1 日本語の手順**

```ts
export function shippingFee(subtotal: number, isMember: boolean): number {
  // 送料 fee を入れ直せる変数として作り、500 を入れる
  // もし subtotal が 3000 以上、または isMember が true なら
  //   fee に 0 を入れ直す
  // fee を返す
}
```

**ヒント 2 コードへの直し方**

「以上」は `>=`、「または」は `||` です。「isMember が true」は、`isMember` とだけ書きます。

### 問 17 n が 1 になるまでの手順の数を返す

**テストで確かめる値**

- `collatzSteps(6)` は `8`
- `collatzSteps(1)` は `0`（最初から 1）
- `collatzSteps(7)` は `16`

**ヒント 1 日本語の手順**

```ts
export function collatzSteps(n: number): number {
  // 今の数 current を入れ直せる変数として作り、引数 n を写す
  // 回数 steps を入れ直せる変数として作り、0 を入れる
  // current が 1 と等しくない間くり返す
  //   current が偶数なら current ÷ 2、そうでなければ current × 3 + 1 を、current に入れ直す
  //   steps を 1 増やす
  // steps を返す
}
```

**ヒント 2 コードへの直し方**

「等しくない」は `!==`、「偶数」は「2 で割った余りが 0 と等しい」です。「〜なら A、そうでなければ B」は条件演算子で書けます。`if` で書いてもかまいません。

### 問 18 2 つの正の整数の最大公約数を返す

**テストで確かめる値**

- `gcd(12, 18)` は `6`
- `gcd(7, 5)` は `1`
- `gcd(100, 25)` は `25`

**ヒント 1 日本語の手順**

```ts
export function gcd(a: number, b: number): number {
  // 割られる数 x を入れ直せる変数として作り、a を写す
  // 割る数 y を入れ直せる変数として作り、b を写す
  // y が 0 と等しくない間くり返す
  //   余り rest を作り、x を y で割った余りを入れる
  //   x に y を入れ直す
  //   y に rest を入れ直す
  // x を返す
}
```

**ヒント 2 コードへの直し方**

くり返しの中の 3 行は、この順番を守ります。`x` に入れ直す前に `y` を変えると、`y` の元の値が消えてしまいます。`a` が `b` より小さくても、1 回目で入れ替わります。

### 問 19 フィボナッチ数列の n 番目を返す

**テストで確かめる値**

- `fibonacci(10)` は `55`
- `fibonacci(0)` は `0`
- `fibonacci(1)` は `1`
- `fibonacci(2)` は `1`

**ヒント 1 日本語の手順**

```ts
export function fibonacci(n: number): number {
  // 1 つ前の数 prev を入れ直せる変数として作り、0 を入れる
  // 今の数 current を入れ直せる変数として作り、1 を入れる
  // i を 0 から、n より小さい間 1 ずつ増やしながらくり返す
  //   次の数 next を作り、prev と current を足した数を入れる
  //   prev に current を入れ直す
  //   current に next を入れ直す
  // prev を返す
}
```

**ヒント 2 コードへの直し方**

`next` はくり返しの中で毎回新しく作るので `const` です。`n` が 0 のときはくり返さず、`prev` の 0 を返します。

### 問 20 秒を「時:分:秒」の形にする

**テストで確かめる値**

- `secondsToClock(3723)` は `"01:02:03"`
- `secondsToClock(59)` は `"00:00:59"`
- `secondsToClock(36000)` は `"10:00:00"`（10 時間）

**ヒント 1 日本語の手順**

```ts
export function secondsToClock(seconds: number): string {
  // 時 h を作り、seconds ÷ 3600 を切り捨てた数を入れる
  // 分 m を作り、seconds を 3600 で割った余りを 60 で割り、切り捨てた数を入れる
  // 秒 s を作り、seconds を 60 で割った余りを入れる
  // 関数 pad を作る。n を受け取り、n を文字列にして前を "0" で埋め、2 文字にしたものを返す
  // pad(h)、pad(m)、pad(s) を ":" でつないだ文字列を返す
}
```

**ヒント 2 コードへの直し方**

関数を作る行は、問20 のサンプルの `toYen` と同じアロー関数です。文字列にするのは `String()`、前を埋めるのは `.padStart()` です。最後の行はテンプレートリテラルで作ります。

### 応用 買い物かごの合計金額を返す

**テストで確かめる値**

- `checkout(1000, 2, 0)` は `2500`（2000 円 + 送料）
- `checkout(1000, 5, 0)` は `5000`（ちょうど 5000 円は送料無料）
- `checkout(1000, 5, 100)` は `5400`（引いたあとの 4900 円で送料を決める）
- `checkout(2500, 3, 1000)` は `6500`
- `checkout(100, 1, 500)` は `500`（0 円 + 送料）

**ヒント 1 日本語の手順**

```ts
export function checkout(price: number, quantity: number, coupon: number): number {
  // 小計 subtotal を作り、price × quantity を入れる
  // 合計 total を入れ直せる変数として作り、subtotal から coupon を引いた数を入れる
  // もし total が 0 より小さいなら
  //   total に 0 を入れ直す
  // もし total が 5000 より小さいなら
  //   total に 500 を足す
  // total を返す
}
```

**ヒント 2 コードへの直し方**

入れ直さない `subtotal` は `const`、入れ直す `total` は `let` です。「より小さい」は `<` です。
