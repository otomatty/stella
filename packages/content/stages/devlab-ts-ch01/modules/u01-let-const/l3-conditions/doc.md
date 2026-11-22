---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-statements-if-else, SRC-typescriptbook-statements-for-of]
---

# レッスン1-3 条件とくり返しの組み立て

## このレッスンの目標

- [ ] 条件が続く間くり返すコードを読み、どの値で止まるかを説明できる
- [ ] 複数の条件を組み合わせ、どの処理が選ばれるかを追える
- [ ] 桁や文字を取り出し、数を丸めたり表示の桁をそろえたりできる
- [ ] 二つの変数を、以前の値を保ちながら順に入れ直せる

## 1-3-1 条件が続く間くり返す

> **while は、条件が true の間だけくり返します。**

条件は中に入る前に毎回調べます。最初から false なら一度も実行しません。引数を更新したいときは、let の別の変数に写して使います。

```ts
// 残りの水の量を入れる
let rest = 300;
// 水が残る間くり返す
while (rest > 0) {
  // ひと口分の水の量を引く
  rest = rest - 100;
}
```

## 1-3-2 1の位を取り出す

> **10 で割った余りが 1 の位、10 で割って切り捨てると残りの桁になります。**

0 以上の整数を 10 で割ると、余りは右端の数字です。商を切り捨てると、その数字を外した残りが得られます。

```ts
// 取り出す前の数を入れる
let n = 456;
// 1の位を余りで取り出す
const last = n % 10;
// 右端を外した数を入れ直す
n = Math.floor(n / 10);
```

## 1-3-3 そうでなければ

> **else と else if で、条件ごとに別の処理を選べます。**

if と else if の条件を上から順に確かめ、最初に合ったところだけを実行します。どれにも合わないときは else の中身を実行します。

```ts
// 今日の天気を用意する
const weather = "晴れ";
// 選んだ持ち物を入れる変数を用意する
let item = "";
// 雨か確かめる
if (weather === "雨") {
  // 持ち物を傘にする
  item = "傘";
// 雨でなければ晴れか確かめる
} else if (weather === "晴れ") {
  // 持ち物を帽子にする
  item = "帽子";
// どちらでもない場合に進む
} else {
  // 持ち物をなしにする
  item = "なし";
}
```

## 1-3-4 割り切れるかを調べる

> **余りが 0 なら割り切れます。&& で 2 つの条件を両方確かめます。**

余りが 0 なら割り切れます。&& は、両側の条件が両方とも true のときにだけ true になります。

```ts
// 分ける前の枚数を入れる
const n = 12;
// 3で割り切れるか調べる
const exact = n % 3 === 0;
// 3と4の両方で割り切れるか調べる
const both = n % 3 === 0 && n % 4 === 0;
```

## 1-3-5 数を文字列にする

> **String() で、数を文字列に変えられます。**

7 は数で、"7" は文字列です。戻り値の型が string の関数で数を文字として返したいときは、String() を使います。

```ts
// 文字列にして番をつなげる
const sign = String(7) + "番";
```

## 1-3-6 四捨五入する

> **Math.round は、小数点以下を四捨五入して整数にします。**

ここでは 0 以上の数を使います。小数部分が 0.5 未満なら切り下げ、0.5 以上なら切り上げます。Math.floor は小数部分の大きさによらず切り捨てます。

```ts
// 2.4を四捨五入する
const low = Math.round(2.4);
// 2.5を四捨五入する
const high = Math.round(2.5);
```

## 1-3-7 大きいほうを残す

> **比べて大きいほうを変数に残していくと、最大値が求まります。**

最初の値を最大値の候補にし、次の値のほうが大きければ入れ直します。同じか小さいときは、今の候補が残ります。

```ts
// 一人目の身長を用意する
const first = 152;
// 二人目の身長を用意する
const second = 168;
// 最初の値を最大値の候補にする
let max = first;
// 次の値のほうが大きいか調べる
if (second > max) {
  // 大きいほうを残す
  max = second;
}
```

## 1-3-8 はいかいいえの値

> **true と false の 2 つだけをとる種類が boolean です。**

boolean は、true と false の二つだけをとる型です。大小を比べた結果もこの型です。if の条件にそのまま書けます。

```ts
// 会員であることを変数に入れる
const isMember: boolean = true;
// 会員かどうかで処理を分ける
if (isMember) {
  // 会員であることを表示する
  console.log("会員");
}
```

## 1-3-9 どちらかが合えば

> **|| は、どちらかの条件が true なら true になります。**

|| は少なくとも片方が true なら true です。&& は両方が true のときだけ true です。

```ts
// どちらかの条件で利用できるか調べる
const canEnter = true || false;
```

## 1-3-10 含まれるかを調べる

> **.includes() で、文字列に文字が含まれるかを調べられます。**

.includes() は文字列に点でつなぐメソッドです。探す文字が一度でも見つかれば true、一度も見つからなければ false を返します。大文字と小文字は区別します。

```ts
// 原材料に乳の文字があるか調べる
const found = "小麦、卵、砂糖".includes("乳");
```

## 1-3-11 等しくない間くり返す

> **!== は等しくないとき true です。while と組み合わせて、目標になるまでくり返します。**

!== は二つの値が等しくないとき true を返します。while の条件にすると、目標の値に達したところで止まります。途中で偶数か確かめるには、2 で割った余りが 0 かを見ます。

```ts
// 出発する階を入れる
let floor = 5;
// 1階と等しくない間くり返す
while (floor !== 1) {
  // 今の階を1つ下げる
  floor--;
}
```

## 1-3-12 2つの値を入れ替えていく

> **一時的な変数に退避すると、2 つの値を順に入れ替えられます。**

余りを別の変数に控え、割られる数に元の割る数を移します。最後に、割る数へ控えた余りを入れます。先に割る数を書き換えると、その元の値が失われます。

```ts
// 割られる数を入れる
let a = 20;
// 割る数を入れる
let b = 8;
// 入れ直す前に余りを控える
const r = a % b;
// 前の割る数を次の割られる数にする
a = b;
// 控えた余りを次の割る数にする
b = r;
```

## 1-3-13 前の2つから次を作る

> **2 つの変数をずらしながら更新すると、前の 2 つから次の値を作れます。**

前の二つを足して次の値を先に控えます。そのあと、一つ前の値と、控えた次の値を順に入れ直します。次の計算に必要な二つの値だけを持てば続けられます。

```ts
// 二つ前の段への上り方の数を入れる
let prev = 3;
// 一つ前の段への上り方の数を入れる
let curr = 5;
// 次の段への上り方を合計する
const next = prev + curr;
// 一つ前の値を二つ前にずらす
prev = curr;
// 計算した次の値を一つ前に入れる
curr = next;
```

## 1-3-14 2桁にそろえる

> **.padStart() で、決まった桁数になるよう前を埋められます。**

.padStart() の最初の引数は仕上がりの長さ、次の引数は埋める文字です。指定の長さ以上ならそのままです。数は先に String() で文字列にします。

```ts
// 125秒に含まれる分を求める
const minutes = Math.floor(125 / 60);
// 分に含まれない残りの秒を求める
const seconds = 125 % 60;
// 分の前を0で埋めて2桁にする
const mm = String(minutes).padStart(2, "0");
// 秒の前を0で埋めて2桁にする
const ss = String(seconds).padStart(2, "0");
// 分と秒をコロンでつなぐ
const label = `${mm}:${ss}`;
```

## もっと知りたい人へ

- サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)
- サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)
- サバイバルTypeScript [if-else文](https://typescriptbook.jp/reference/statements/if-else)
- サバイバルTypeScript [boolean型](https://typescriptbook.jp/reference/values-types-variables/boolean)
- サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)
- サバイバルTypeScript [for-of文](https://typescriptbook.jp/reference/statements/for-of)

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

「〜の間くり返す」は `while`、「より大きい」は `>` です。最初に、引数を `let` の変数に写します。

### 問 12 FizzBuzz

**テストで確かめる値**

- `fizzBuzz(15)` は `"FizzBuzz"`
- `fizzBuzz(9)` は `"Fizz"`
- `fizzBuzz(10)` は `"Buzz"`
- `fizzBuzz(7)` は `"7"`（数値の 7 ではなく文字列）

**ヒント 1 日本語の手順**

```ts
export function fizzBuzz(n: number): string {
  // もし両方の倍数なら、"FizzBuzz" を返す
  // そうでなく、3 の倍数なら "Fizz" を返す
  // そうでなく、5 の倍数なら "Buzz" を返す
  // どちらでもなければ n を文字列にしたものを返す
}
```

**ヒント 2 コードへの直し方**

両方の条件は `&&` でつなぎ、先頭で確かめます。続く条件は `else if` で並べます。数を文字列にするのは `String()` です。

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

### 問 16 母音の数を返す

母音は `a`、`e`、`i`、`o`、`u` の五つの英字です。

**テストで確かめる値**

- `countVowels("education")` は `5`
- `countVowels("rhythm")` は `0`（母音がない）
- `countVowels("")` は `0`

**ヒント 1 日本語の手順**

```ts
export function countVowels(text: string): number {
  // 母音 vowels を作り、"aeiou" を入れる
  // 数 count を入れ直せる変数として作り、0 を入れる
  // text から 1 文字ずつ c に取り出してくり返す
  //   もし vowels に c が含まれるなら
  //     count を 1 増やす
  // count を返す
}
```

**ヒント 2 コードへの直し方**

「vowels に c が含まれる」は、1-3-10 で確かめた `.includes()` を使います。問9 と同じ形で、条件だけが違います。

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

「等しくない」は `!==`、「偶数」は「2 で割った余りが 0 と等しい」です。偶数と奇数の処理は `if` と `else` で分けます。

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

同じ桁埋めを三回使います。関数にまとめるなら、1-1 で習った `function` で書けます。文字列にするのは `String()`、前を埋めるのは `.padStart()` です。最後の行はテンプレートリテラルで作ります。

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
