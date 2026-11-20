---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-annotation]
---

# レッスン2-1 型注釈

## このレッスンの目標

- [ ] 引数と戻り値に型注釈を書ける
- [ ] 文字列の道具と条件の組合せの結果を説明できる

## 2-1-1 型注釈を自分で書く

> **引数は名前の後ろ、戻り値はかっこの後ろに型を書きます。**

型は値の種類です。型注釈は、使える値の種類をコードに書く印です。
q01 では書いてあった型注釈を、ここから自分で書きます。
配送のラベルには文字の宛先と数の日数が必要です。
引数は `名前: 型` をカンマで区切ります。
戻り値は閉じかっこの後ろに `: 型` を書きます。

```ts
// 関数 shippingLabel を作る。文字列 city と数値 days を受け取り、文字列を返す
function shippingLabel(city: string, days: number): string {
  // city と days を埋め込んだ「◯まで◯日」の文字列を返す
  return `${city}まで${days}日`;
  // 関数の中身はここまで
}
// 関数を呼び、返された文字列を表示する
console.log(shippingLabel("名古屋", 3));
// 結果: "名古屋まで3日"
```

`string` は文字列、`number` は数値です。
`shippingLabel("名古屋", 3)` は、宛先、日数の順に渡します。
引数の名前は自由ですが、数・順番・型は問題の例とそろえます。

はい・いいえを表す値は `true` と `false` です。
これを返す関数の戻り値の型は `boolean` と書きます。

```ts
// 関数 isFreeShipping を作る。数値 total を受け取り、真偽値を返す
function isFreeShipping(total: number): boolean {
  // total が5000以上かどうかを返す
  return total >= 5000;
  // 関数の中身はここまで
}
// 無料になる場合とならない場合を表示する
console.log(isFreeShipping(6000), isFreeShipping(3000));
// 結果: true false
```

よくある間違いは、数値の代わりに文字列を渡すことです。
`shippingLabel("名古屋", "3")` は実行前の型の確認でエラーになります。
順番を逆にした `shippingLabel(3, "名古屋")` もエラーです。
引数の型を書かない場合も、この課題の設定ではエラーになります。

参考: サバイバルTypeScript [型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)。説明と例は教材用に独自作成しています。

## 2-1-2 文字列の道具

> **文字列の長さや一部を調べ、加工や条件の組合せに使えます。**

文字列には、長さを調べたり表示を作ったりする道具があります。
メソッドは値の後ろに付けて呼ぶ道具です。
`.length` は文字数を表す値で、かっこを付けません。
`.slice(始め, 終わり)` は、一部を取り出します。
番号は 0 から数え、終わりに指定した番号の文字は含めません。
終わりを省くと、最後まで取り出します。

```ts
// 商品コード code を作り、"TKY-0012" を入れる
const code = "TKY-0012";
// 文字数 size を作り、code の文字数を入れる
const size = code.length;
// 地域 area を作り、0番目から3番目の前までの文字列を入れる
const area = code.slice(0, 3);
// 番号 serial を作り、4番目から最後までの文字列を入れる
const serial = code.slice(4);
// 文字数と取り出した部分を表示する
console.log(size, area, serial);
// 結果: 8 "TKY" "0012"
```

よくある間違いは `code.length()` と書くことです。
メソッドではないので、型のエラーになります。
`slice(0, 3)` は 0・1・2 番目の 3 文字です。
3 番目のハイフンまで取ると考えないようにします。
文字数は空の文字列なら 0 です。
絵文字などは、見た目の 1 文字と数え方が異なることがあります。

`.repeat(回数)` は文字列を指定回数つなげます。
`.toUpperCase()` は英字を大文字にします。
数字や記号は変わらず、もとの文字列も変わりません。

```ts
// 評価 rating を作り、星を4回つなげた文字列を入れる
const rating = "★".repeat(4);
// 空の表示 empty を作り、星を0回つなげた文字列を入れる
const empty = "★".repeat(0);
// 商品コード itemCode を作り、"abc-12" を入れる
const itemCode = "abc-12";
// upper を作り、大文字にした文字列を入れる
const upper = itemCode.toUpperCase();
// 繰り返しと変換の結果を表示する
console.log(rating, empty, upper, itemCode);
// 結果: "★★★★" "" "ABC-12" "abc-12"
```

数の `.toLocaleString("ja-JP")` は、日本の書き方の文字列を作ります。
3 桁ごとのカンマを付けた売上の表示に使えます。
`"ja-JP"` は地域の指定です。省くと環境の設定で表示が変わります。

```ts
// 売上 sales を作り、2500000 を入れる
const sales = 2500000;
// 表示 text を作り、日本の書き方で区切った文字列を入れる
const text = sales.toLocaleString("ja-JP");
// 表示用の文字列を表示する
console.log(text);
// 結果: "2,500,000"
```

よくある間違いは、この結果を数値と思うことです。
計算する数と、画面に出す文字列を分けて扱います。

`&&` は「かつ」です。二つの条件が両方 `true` のときだけ `true` になります。
在庫があり、支払済みなら出荷する、といった判定に使います。

```ts
// 関数 canShip を作り、数値 stock と真偽値 isPaid を受け取る
function canShip(stock: number, isPaid: boolean): boolean {
  // 在庫が0より大きく、かつ支払済みかどうかを返す
  return stock > 0 && isPaid;
  // 関数の中身はここまで
}
// 両方が真の場合と、片方が偽の場合を表示する
console.log(canShip(3, true), canShip(0, true), canShip(3, false));
// 結果: true false false
```

よくある間違いは、範囲を `1 <= value <= 10` と書くことです。
これは型のエラーです。二つの比較を `&&` でつなぎます。

参考: サバイバルTypeScript [型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)。説明と例は教材用に独自作成しています。

## もっと知りたい人へ

- サバイバルTypeScript [型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)
- [知識問題](knowledge.md)で理解を確かめてから、この単元の「01章 q02 型注釈」に取り組みます。

## 問題ごとのヒント

ヒントは書き方ガイドの日本語の骨組みです。中の処理を自分でコードに直します。

### 問 1 a から b を引いた数を返す

**テストで確かめる値**

- `subtract(5, 3)` → `2`
- `subtract(0, 7)` → `-7`（マイナスになることもある）

**ヒント 1 日本語の手順**

```ts
// 関数 subtract を作る。数値 a と数値 b を受け取り、数値を返す
export function subtract() {
  // a から b を引いた数を返す
}
```

**ヒント 2 コードへの直し方**

1 行目の「◯ を受け取り」はかっこの中の引数に、「数値を返す」はかっこの後ろの `: number` になります。問1 のサンプルの `shippingLabel` と同じ形です。「引く」は `-` です。

### 問 2 名前の後ろに「さん」を付ける

**テストで確かめる値**

- `honorific("山田")` → `"山田さん"`
- `honorific("Taro")` → `"Taroさん"`

**ヒント 1 日本語の手順**

```ts
// 関数 honorific を作る。文字列 name を受け取り、文字列を返す
export function honorific() {
  // name の後ろに "さん" をつなげた文字列を返す
}
```

**ヒント 2 コードへの直し方**

「文字列 name を受け取り」は `name: string`、「文字列を返す」は `: string` です。つなげた文字列は、テンプレートリテラル（q01 の問3）で作ります。

### 問 3 18 歳以上なら true を返す

**テストで確かめる値**

- `isAdult(18)` → `true`（ちょうど 18 歳も含む）
- `isAdult(17)` → `false`

**ヒント 1 日本語の手順**

```ts
// 関数 isAdult を作る。数値 age を受け取り、true か false を返す
export function isAdult() {
  // age が 18 以上かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

問1 のサンプルの `isFreeShipping` と同じ形です。「true か false を返す」は `: boolean`、「以上」は `>=` です。比べた結果をそのまま返すので、`if` は要りません。

### 問 4 text を times 回つなげた文字列を返す

**テストで確かめる値**

- `repeatText("ab", 3)` → `"ababab"`
- `repeatText("x", 0)` → `""`（0 回なら空の文字列）

**ヒント 1 日本語の手順**

```ts
// 関数 repeatText を作る。文字列 text と数値 times を受け取り、文字列を返す
export function repeatText() {
  // text を times 回つなげた文字列を返す
}
```

**ヒント 2 コードへの直し方**

「◯ を ◯ 回つなげた文字列」は `.repeat()` です。問4 のサンプルの `rating` の行と同じ形です。q01 のように `for` 文で書いてもかまいません。

### 問 5 長方形の面積を返す

**テストで確かめる値**

- `rectangleArea(3, 4)` → `12`
- `rectangleArea(10, 0)` → `0`

**ヒント 1 日本語の手順**

```ts
// 関数 rectangleArea を作る。数値 width と数値 height を受け取り、数値を返す
export function rectangleArea() {
  // width と height を掛けた数を返す
}
```

**ヒント 2 コードへの直し方**

掛け算は `*` です。引数の名前は自由ですが、`width` と `height` のように中身が分かる名前にします。

### 問 6 姓と名を半角スペースでつなぐ

**テストで確かめる値**

- `fullName("山田", "太郎")` → `"山田 太郎"`

**ヒント 1 日本語の手順**

```ts
// 関数 fullName を作る。文字列 lastName と文字列 firstName を受け取り、文字列を返す
export function fullName() {
  // lastName と firstName を半角スペースでつないだ文字列を返す
}
```

**ヒント 2 コードへの直し方**

テンプレートリテラルの中に、2 つの `${ }` を並べ、その間に半角スペースを書きます。

### 問 7 摂氏を華氏に変える

**テストで確かめる値**

- `celsiusToFahrenheit(100)` → `212`（水が沸騰する温度）
- `celsiusToFahrenheit(0)` → `32`（水が凍る温度）

**ヒント 1 日本語の手順**

```ts
// 関数 celsiusToFahrenheit を作る。数値 celsius を受け取り、数値を返す
export function celsiusToFahrenheit() {
  // celsius × 9 ÷ 5 + 32 を返す
}
```

**ヒント 2 コードへの直し方**

× は `*`、÷ は `/` です。掛け算と割り算は足し算より先に計算されるので、そのまま並べれば式のとおりになります。整形（Prettier）は、`*` と `/` が並ぶところにかっこを付けた形を求めます。保存して整形すると、`(celsius * 9) / 5 + 32` の形になります。計算の結果は同じです。

### 問 8 偶数なら true を返す

**テストで確かめる値**

- `isEven(4)` → `true`
- `isEven(7)` → `false`
- `isEven(0)` → `true`

**ヒント 1 日本語の手順**

```ts
// 関数 isEven を作る。数値 n を受け取り、true か false を返す
export function isEven() {
  // n を 2 で割った余りが 0 と等しいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「割った余り」は `%`、「等しい」は `===` です。q01 の問12 で出た「3 で割った余りが 0」と同じ形の式を、そのまま返します。

### 問 9 時刻によってあいさつを変える

**テストで確かめる値**

- `greet("山田", 9)` → `"おはよう、山田さん"`
- `greet("佐藤", 12)` → `"こんにちは、佐藤さん"`（ちょうど 12 時は「こんにちは」）

**ヒント 1 日本語の手順**

```ts
// 関数 greet を作る。文字列 name と数値 hour を受け取り、文字列を返す
export function greet() {
  // もし hour が 12 より小さいなら
  //   name を埋め込んだ「おはよう、◯さん」を返す
  // name を埋め込んだ「こんにちは、◯さん」を返す
}
```

**ヒント 2 コードへの直し方**

`return` を実行すると、その場で関数が終わります。`if` の中で返したときは、後ろの行は実行されません。そのため、最後の行は `if` の外にそのまま書けます。「より小さい」は `<` です。

### 問 10 名前の最初の 1 文字を返す

**テストで確かめる値**

- `initial("Taro")` → `"T"`
- `initial("山田")` → `"山"`（日本語も 1 文字）

**ヒント 1 日本語の手順**

```ts
// 関数 initial を作る。文字列 name を受け取り、文字列を返す
export function initial() {
  // name の 0 番目から 1 番目の前までを取り出した文字列を返す
}
```

**ヒント 2 コードへの直し方**

問10 のサンプルの `area` の行と同じ形で、数だけが違います。「0 番目から 1 番目の前まで」は、先頭の 1 文字です。

### 問 11 percentOff パーセント引きの価格を返す

**テストで確かめる値**

- `discountPrice(1000, 15)` → `850`
- `discountPrice(999, 10)` → `899`（899.1 円を切り捨て）

**ヒント 1 日本語の手順**

```ts
// 関数 discountPrice を作る。数値 price と数値 percentOff を受け取り、数値を返す
export function discountPrice() {
  // price × (100 - percentOff) ÷ 100 を切り捨てた数を返す
}
```

**ヒント 2 コードへの直し方**

「100 - percentOff」を先に計算するために、かっこで囲みます。切り捨ては `Math.floor()`（q01 の問1）です。

### 問 12 金額を 3 桁ごとのカンマ区切りにし、「円」を付ける

**テストで確かめる値**

- `formatYen(1234)` → `"1,234円"`
- `formatYen(1000000)` → `"1,000,000円"`

**ヒント 1 日本語の手順**

```ts
// 関数 formatYen を作る。数値 amount を受け取り、文字列を返す
export function formatYen() {
  // amount を 3 桁ごとのカンマ区切りにした文字列の後ろに "円" をつなげて返す
}
```

**ヒント 2 コードへの直し方**

「3 桁ごとのカンマ区切りにした文字列」は、問12 のサンプルの `text` の行と同じ形です。メソッドはテンプレートリテラルの `${ }` の中でも呼べます（q01 の問20）。

### 問 13 text の文字数が length より多ければ true を返す

**テストで確かめる値**

- `isLongerThan("hello", 3)` → `true`（5 文字は 3 より多い）
- `isLongerThan("hi", 2)` → `false`（2 文字は 2 と同じ）

**ヒント 1 日本語の手順**

```ts
// 関数 isLongerThan を作る。文字列 text と数値 length を受け取り、true か false を返す
export function isLongerThan() {
  // text の文字数が length より大きいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「text の文字数」は `text.length`、「より大きい」は `>` です。引数の名前 `length` と、文字数の `.length` は別のものです。

### 問 14 半分の数を返す

**テストで確かめる値**

- `half(7)` → `3.5`
- `half(-4)` → `-2`

**ヒント 1 日本語の手順**

```ts
// 関数 half を作る。数値 n を受け取り、数値を返す
export function half() {
  // n ÷ 2 を返す
}
```

**ヒント 2 コードへの直し方**

÷ は `/` です。割り切れないときは小数になります（q01 の問2）。

### 問 15 ラベルの後ろに件数を「（◯件）」の形で付ける

**テストで確かめる値**

- `labelWithCount("メッセージ", 3)` → `"メッセージ（3件）"`
- `labelWithCount("通知", 0)` → `"通知（0件）"`

**ヒント 1 日本語の手順**

```ts
// 関数 labelWithCount を作る。文字列 label と数値 count を受け取り、文字列を返す
export function labelWithCount() {
  // label と count を埋め込んだ「◯（◯件）」の文字列を返す
}
```

**ヒント 2 コードへの直し方**

q01 の問3 と同じく、テンプレートリテラルで作ります。数値の `count` は、埋め込むと文字に変わります。

### 問 16 value が min 以上 max 以下なら true を返す

**テストで確かめる値**

- `isBetween(5, 1, 10)` → `true`
- `isBetween(10, 1, 10)` → `true`（ちょうど max も含む）
- `isBetween(11, 1, 10)` → `false`

**ヒント 1 日本語の手順**

```ts
// 関数 isBetween を作る。数値 value と数値 min と数値 max を受け取り、true か false を返す
export function isBetween() {
  // value が min 以上、かつ value が max 以下かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「かつ」は `&&`、「以上」は `>=`、「以下」は `<=` です。問16 のサンプルの `canShip` と同じく、比べる式を 2 つ `&&` でつなぎます。

### 問 17 秒を分に変える

**テストで確かめる値**

- `secondsToMinutes(150)` → `2`（2 分 30 秒の 30 秒を切り捨て）
- `secondsToMinutes(59)` → `0`

**ヒント 1 日本語の手順**

```ts
// 関数 secondsToMinutes を作る。数値 seconds を受け取り、数値を返す
export function secondsToMinutes() {
  // seconds ÷ 60 を切り捨てた数を返す
}
```

**ヒント 2 コードへの直し方**

q01 の問3 の「時間」を求める行と同じ形です。切り捨ては `Math.floor()` です。

### 問 18 英字を大文字にして、最後に「!」を付ける

**テストで確かめる値**

- `shout("hello")` → `"HELLO!"`
- `shout("Agora")` → `"AGORA!"`（大文字はそのまま）

**ヒント 1 日本語の手順**

```ts
// 関数 shout を作る。文字列 text を受け取り、文字列を返す
export function shout() {
  // text を大文字にした文字列の後ろに "!" をつなげて返す
}
```

**ヒント 2 コードへの直し方**

「大文字にした文字列」は、問18 のサンプルの `upper` の行と同じ `.toUpperCase()` です。テンプレートリテラルの `${ }` の中で呼べます。

### 問 19 18 歳以上で、免許を持っていれば true を返す

**テストで確かめる値**

- `canDrive(20, true)` → `true`
- `canDrive(20, false)` → `false`（免許がない）
- `canDrive(17, true)` → `false`（18 歳より下）

**ヒント 1 日本語の手順**

```ts
// 関数 canDrive を作る。数値 age と true か false の hasLicense を受け取り、true か false を返す
export function canDrive() {
  // age が 18 以上、かつ hasLicense が true かどうかを返す
}
```

**ヒント 2 コードへの直し方**

問16 のサンプルの `canShip` と同じ形です。「true か false の hasLicense」は `hasLicense: boolean` です。「hasLicense が true」は `hasLicense` とだけ書きます（q01 の問15）。

### 問 20 char を width 個並べた文字列を返す

**テストで確かめる値**

- `line("=", 5)` → `"====="`
- `line("-", 1)` → `"-"`

**ヒント 1 日本語の手順**

```ts
// 関数 line を作る。文字列 char と数値 width を受け取り、文字列を返す
export function line() {
  // char を width 回つなげた文字列を返す
}
```

**ヒント 2 コードへの直し方**

問4 と同じく `.repeat()` を使います。

### 応用（総合） 金額の表示と、メンバーの紹介文を作る

**テストで確かめる値**

- `formatPrice(1200, "円")` → `"1,200円"`
- `formatPrice(1234567, "円")` → `"1,234,567円"`
- `formatPrice(500, "ドル")` → `"500ドル"`（単位は引数で変わる）
- `formatPrice(0, "円")` → `"0円"`
- `describeMember("佐藤", 28, true)` → `"佐藤（28歳・リーダー）"`
- `describeMember("鈴木", 31, false)` → `"鈴木（31歳）"`

**ヒント 1 日本語の手順**

```ts
// 関数 formatPrice を作る。数値 price と文字列 unit を受け取り、文字列を返す
export function formatPrice() {
  // price を 3 桁ごとのカンマ区切りにした文字列の後ろに unit をつなげて返す
}

// 関数 describeMember を作る。文字列 name と数値 age と true か false の isLeader を受け取り、文字列を返す
export function describeMember() {
  // もし isLeader が true なら
  //   name と age を埋め込んだ「◯（◯歳・リーダー）」を返す
  // name と age を埋め込んだ「◯（◯歳）」を返す
}
```

**ヒント 2 コードへの直し方**

`formatPrice` は問12 と同じ形で、「円」の代わりに `unit` を埋め込みます。`describeMember` は問9 と同じく、`if` の中で `return` します。「isLeader が true」は `isLeader` とだけ書きます。
