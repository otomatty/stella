---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-values-types-variables-truthy-falsy-values]
---

# レッスン6-1 q06 boolean型

## このレッスンの目標

- [ ] 比べた結果を組み合わせた式を、そのまま返せる
- [ ] 正規表現の test で、合う文字が含まれるかを調べられる

動画を見たら、このまとめで書き方を振り返ります。この単元の「01章 q06 boolean型」を VS Code で開き、解放された問題を一問ずつ確認して提出します。

## 6-1-1 条件を組み合わせて返す

> **比べた結果を && や || で組み合わせた式は、そのまま return できます。**

比べる式の結果は `true` か `false` です。
戻り値の `: boolean` は、この二つのどちらかを返す約束です。
`if` で返し分けなくても、比べた結果をそのまま `return` できます。

```ts
// 関数 isFreeShipping を作る。数値の subtotal を受け取り、真偽を返す
function isFreeShipping(subtotal: number): boolean {
  // subtotal が 5000 以上かどうかを返す
  return subtotal >= 5000;
}
// isFreeShipping に 6000 と 3000 を渡した結果を表示する
console.log(isFreeShipping(6000), isFreeShipping(3000));
// 結果: true false
```

`&&` は「かつ」、`||` は「または」、`!` は「でない」です。
次の表は、両側が真偽値の場合です。

| 書き方 | 結果 |
| --- | --- |
| `true && true` | `true` |
| `true && false` | `false` |
| `false \|\| true` | `true` |
| `false \|\| false` | `false` |
| `!true` | `false` |

```ts
// 関数 canReserve を作る。空席数と休業日かを受け取り、予約できるかを返す
function canReserve(seats: number, isClosed: boolean): boolean {
  // seats が 0 より大きい、かつ isClosed でないかどうかを返す
  return seats > 0 && !isClosed;
}
// 空席がある営業日と休業日の結果を表示する
console.log(canReserve(3, false), canReserve(3, true));
// 結果: true false
```

よくある間違いは、`: boolean` の関数で数値をそのまま返すことです。
`return seats;` は型の確認でエラーになります。
この課題の `if` の条件にも、真偽値になる式を書きます。
`if (seats)` ではなく、`if (seats > 0)` のように比べます。
数値の 0 などを偽として扱う決まりはありますが、この課題では使いません。
`!isClosed` は `isClosed === false` と同じ判定を短く書けます。
複数の条件をまとめるときは、かっこでまとまりを示せます。


試合の例では、天気と人数を組み合わせて返します。

```ts
// 晴れていて、選手が9人以上そろったかを返す
function canStartGame(isSunny: boolean, players: number): boolean {
  // 天気と人数の条件を組み合わせて返す
  return isSunny && players >= 9;
}
```

```ts
// 雨か人数不足なら、試合を中止する
function shouldCancelGame(isRainy: boolean, players: number): boolean {
  // 片方でも当てはまれば中止にする
  return isRainy || players < 9;
}
```

```ts
// 試合を始められないときは待つ
function shouldWait(isSunny: boolean, players: number): boolean {
  // 開始できるかの結果を逆にする
  return !canStartGame(isSunny, players);
}
```

真のときに `return true;`、偽のときに `return false;` と分けた形と、判定は同じです。
`if` の中で `return` すると、関数はそこで終わります。

屋外なら晴れとグラウンド、屋内なら屋根と照明が必要だとします。
どちらか一組がそろえばよい条件は、次のようにまとめられます。
各変数には、それぞれの条件を満たすかを真偽値で入れておきます。

```ts
// 屋外か屋内のどちらかで試合ができるかを調べる
const canPlay = (isSunny && hasField) || (hasRoof && hasLights);
```

## 6-1-2 合う文字が含まれるか調べる

> **正規表現.test(文字列) は、合う部分があれば true を返します。**

正規表現は、探す文字の形を表す書き方です。
その後ろに `.test(文字列)` を書くと、合う部分が含まれるかを調べられます。
文字列全体が合う必要はありません。合う部分がなければ `false` です。

| 形 | 探す文字 |
| --- | --- |
| `/\d/` | 半角数字一文字 |
| `/[A-Z]/` | 英大文字一文字 |

```ts
// 部屋の札に半角数字が含まれるかを調べる
const hasNumber = /\d/.test("B2倉庫");
// 結果を表示する（true）
console.log(hasNumber);
```

「B2倉庫」では、数字の2だけが合います。それでも結果は `true` です。
「会議室」には数字が一文字もないので、`/\d/.test("会議室")` は `false` です。

```ts
// 部屋の札に英大文字が含まれるかを調べる
const hasCapital = /[A-Z]/.test("B2倉庫");
// 数字だけの札も調べる
const numberOnly = /[A-Z]/.test("305");
// 結果を表示する（true false）
console.log(hasCapital, numberOnly);
```

`includes("2")` は、決まった文字の2を探します。
`"305".includes("2")` は `false` でも、`/\d/.test("305")` は `true` です。
数字のどれか一文字を探すときは、正規表現で形を指定します。

参考: サバイバルTypeScript [boolean](https://typescriptbook.jp/reference/values-types-variables/boolean)・[truthy-falsy-values](https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values)。説明とコード例は教材用に作成しています。

## 問題ごとのヒント

### 問1 0 より大きければ true を返す

**テストで確かめる値**

- `isPositive(3)` は `true`
- `isPositive(0)` は `false`。0 は 0 より大きくない

**ヒント 1 日本語の手順**

```ts
export function isPositive(n: number): boolean {
  // n が 0 より大きいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「より大きい」は `>` です。上のサンプル `isFreeShipping` と同じく、比べる式をそのまま `return` します。

### 問2 0 より小さければ true を返す

**テストで確かめる値**

- `isNegative(-1)` は `true`
- `isNegative(0)` は `false`。0 は 0 より小さくない

**ヒント 1 日本語の手順**

```ts
export function isNegative(n: number): boolean {
  // n が 0 より小さいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「より小さい」は `<` です。問1 と同じ形です。

### 問3 奇数なら true を返す

**テストで確かめる値**

- `isOdd(3)` は `true`
- `isOdd(-3)` は `true`。負の奇数
- `isOdd(4)` は `false`

**ヒント 1 日本語の手順**

```ts
export function isOdd(n: number): boolean {
  // n を 2 で割った余りが 0 と等しくないかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「等しくない」は `!==` です。`-3 % 2` は `-1` になります。だから「余りが 1 と等しい」で比べると、-3 で間違えます。

### 問4 13 歳以上 19 歳以下なら true を返す

**テストで確かめる値**

- `isTeen(13)` は `true`
- `isTeen(19)` は `true`
- `isTeen(20)` は `false`
- `isTeen(12)` は `false`

**ヒント 1 日本語の手順**

```ts
export function isTeen(age: number): boolean {
  // age が 13 以上、かつ age が 19 以下かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「以上」は `>=`、「以下」は `<=`、「かつ」は `&&` です。算数のように `13 <= age <= 19` とつなげると、型の確認でエラーになります。比べる式を 2 つ書いて、`&&` でつなぎます。

### 問5 土日なら true を返す

**テストで確かめる値**

- `isWeekend(0)` は `true`。日曜
- `isWeekend(6)` は `true`。土曜
- `isWeekend(3)` は `false`。水曜

**ヒント 1 日本語の手順**

```ts
export function isWeekend(day: number): boolean {
  // day が 0 と等しい、または day が 6 と等しいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「等しい」は `===`、「または」は `||` です。

### 問6 母音なら true を返す

**テストで確かめる値**

- `isVowel("a")` は `true`
- `isVowel("E")` は `true`。大文字も母音
- `isVowel("b")` は `false`
- `isVowel("ae")` は `false`。2 文字

**ヒント 1 日本語の手順**

```ts
export function isVowel(char: string): boolean {
  // char の文字数が 1 と等しい、かつ "aeiou" に char を小文字にしたものが含まれるかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

文字数は `.length`、小文字にするのは `.toLowerCase()`、含まれるかは `.includes()` です。`"aeiou".includes("ae")` も `true` になるので、1 文字かどうかも確かめます。

### 問7 逆の真偽値を返す

**テストで確かめる値**

- `not(true)` は `false`
- `not(false)` は `true`

**ヒント 1 日本語の手順**

```ts
export function not(value: boolean): boolean {
  // value でないもの（true なら false、false なら true）を返す
}
```

**ヒント 2 コードへの直し方**

「でない」は `!` です。このまとめのサンプル `canReserve` の `!isClosed` と同じ書き方です。

### 問8 2 つとも true なら true を返す

**テストで確かめる値**

- `both(true, true)` は `true`
- `both(true, false)` は `false`

**ヒント 1 日本語の手順**

```ts
export function both(a: boolean, b: boolean): boolean {
  // a かつ b かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「かつ」は `&&` です。

### 問9 どちらか 1 つでも true なら true を返す

**テストで確かめる値**

- `either(false, true)` は `true`
- `either(false, false)` は `false`

**ヒント 1 日本語の手順**

```ts
export function either(a: boolean, b: boolean): boolean {
  // a または b かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「または」は `||` です。

### 問10 どちらか片方だけが true なら true を返す

**テストで確かめる値**

- `onlyOne(true, false)` は `true`
- `onlyOne(false, true)` は `true`
- `onlyOne(true, true)` は `false`。両方 true
- `onlyOne(false, false)` は `false`

**ヒント 1 日本語の手順**

```ts
export function onlyOne(a: boolean, b: boolean): boolean {
  // a と b が等しくないかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

片方だけが true のとき、a と b は違う値です。だから「等しくない」の `!==` で比べられます。`&&` と `||` と `!` を組み合わせて書いてもかまいません。

### 問11 空の文字列なら true を返す

**テストで確かめる値**

- `isEmpty("")` は `true`
- `isEmpty(" ")` は `false`。空白が 1 文字ある

**ヒント 1 日本語の手順**

```ts
export function isEmpty(text: string): boolean {
  // text の文字数が 0 と等しいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

文字数は `.length` です（q02 の問13）。

### 問12 空の文字列か、空白だけなら true を返す

**テストで確かめる値**

- `isBlank("   ")` は `true`。空白だけ
- `isBlank("")` は `true`。空の文字列
- `isBlank(" a ")` は `false`。a がある

**ヒント 1 日本語の手順**

```ts
export function isBlank(text: string): boolean {
  // text の前後の空白を取り除いた文字列の文字数が 0 と等しいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

前後の空白を取り除くのは `.trim()` です（q05）。`.trim()` の結果に続けて `.length` と書けます。

### 問13 数字が含まれていれば true を返す

**テストで確かめる値**

- `hasDigit("abc1")` は `true`
- `hasDigit("abc")` は `false`

**ヒント 1 日本語の手順**

```ts
export function hasDigit(text: string): boolean {
  // text に数字が含まれるかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「数字が含まれる」は `/\d/` の `.test()` で調べます。このまとめの `hasNumber` の行と同じ形です。

### 問14 強いパスワードなら true を返す

**テストで確かめる値**

- `isStrongPassword("Agora2026")` は `true`
- `isStrongPassword("agora2026")` は `false`。英大文字がない
- `isStrongPassword("Agora")` は `false`。8 文字より短い
- `isStrongPassword("AgoraAgora")` は `false`。数字がない

**ヒント 1 日本語の手順**

```ts
export function isStrongPassword(password: string): boolean {
  // password の文字数が 8 以上、かつ password に数字が含まれる、かつ password に英大文字が含まれるかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

3 つの条件を `&&` でつなぎます。数字は `/\d/`、英大文字は `/[A-Z]/` で調べます（このまとめの表）。

### 問15 2 つの数が同じ符号なら true を返す

**テストで確かめる値**

- `isSameSign(2, 5)` は `true`。どちらも正
- `isSameSign(-2, -5)` は `true`。どちらも負
- `isSameSign(-2, 5)` は `false`
- `isSameSign(0, 5)` は `false`。0 がある

**ヒント 1 日本語の手順**

```ts
export function isSameSign(a: number, b: number): boolean {
  // （a が 0 より大きい、かつ b が 0 より大きい）、または（a が 0 より小さい、かつ b が 0 より小さい）かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

日本語のかっこで囲んだまとまりは、コードでも `( )` で囲みます。`&&` は `||` より先に計算されるので、かっこがなくても結果は同じです。かっこを付けると読みやすくなります。

### 問16 買えるなら true を返す

**テストで確かめる値**

- `canBuy(1000, 800, true)` は `true`
- `canBuy(1000, 800, false)` は `false`。在庫がない
- `canBuy(500, 800, true)` は `false`。お金が足りない

**ヒント 1 日本語の手順**

```ts
export function canBuy(money: number, price: number, inStock: boolean): boolean {
  // money が price 以上、かつ inStock が true かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「以上」は `>=`、「かつ」は `&&` です。「inStock が true」は `inStock` とだけ書きます（q01 の問15 の `isMember` と同じ）。

### 問17 3 の倍数か 5 の倍数なら true を返す

**テストで確かめる値**

- `isMultipleOf3Or5(9)` は `true`。3 の倍数
- `isMultipleOf3Or5(10)` は `true`。5 の倍数
- `isMultipleOf3Or5(7)` は `false`

**ヒント 1 日本語の手順**

```ts
export function isMultipleOf3Or5(n: number): boolean {
  // n を 3 で割った余りが 0 と等しい、または n を 5 で割った余りが 0 と等しいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「割り切れる」は、q01 の問12（FizzBuzz）と同じく `%` と `===` で書きます。2 つを `||` でつなぎます。

### 問18 範囲の外なら true を返す

**テストで確かめる値**

- `isOutOfRange(11, 1, 10)` は `true`。最大値より大きい
- `isOutOfRange(0, 1, 10)` は `true`。最小値より小さい
- `isOutOfRange(10, 1, 10)` は `false`。ちょうど最大値

**ヒント 1 日本語の手順**

```ts
export function isOutOfRange(value: number, min: number, max: number): boolean {
  // value が min より小さい、または value が max より大きいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「より小さい」は `<`、「より大きい」は `>`、「または」は `||` です。

### 問19 正しい名前なら true を返す

**テストで確かめる値**

- `isValidName("山田", 10)` は `true`
- `isValidName("", 10)` は `false`。空
- `isValidName("abcdefghijk", 10)` は `false`。11 文字

**ヒント 1 日本語の手順**

```ts
export function isValidName(name: string, max: number): boolean {
  // name の文字数が 0 より大きい、かつ name の文字数が max 以下かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「空ではない」は「文字数が 0 より大きい」と言い換えられます。文字数は `.length`、「以下」は `<=` です。

### 問20 店が開いていれば true を返す

**テストで確かめる値**

- `isOpen(9, false)` は `true`。平日 9 時
- `isOpen(18, false)` は `false`。平日 18 時
- `isOpen(9, true)` は `false`。休日 9 時
- `isOpen(14, true)` は `true`。休日 14 時

**ヒント 1 日本語の手順**

```ts
export function isOpen(hour: number, isHoliday: boolean): boolean {
  // もし isHoliday が true なら
  //   hour が 10 以上、かつ hour が 15 より小さいかどうか（true か false）を返す
  // hour が 9 以上、かつ hour が 18 より小さいかどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「未満」は「より小さい」なので `<` です。「isHoliday が true」は `isHoliday` とだけ書きます。このまとめの説明のとおり、`if` の中で `return` すると関数はそこで終わるので、最後の行は平日のときだけ実行されます。

### 応用 うるう年・空白以外の文字・会場に入れるか

**テストで確かめる値**

- `isLeapYear(2024)` は `true`。4 で割り切れる
- `isLeapYear(2023)` は `false`
- `isLeapYear(1900)` は `false`。100 で割り切れる
- `isLeapYear(2100)` は `false`。100 で割り切れる
- `isLeapYear(2000)` は `true`。400 で割り切れる
- `hasText("  a ")` は `true`
- `hasText("Agora")` は `true`
- `hasText("")` は `false`
- `hasText("   ")` は `false`。空白だけ
- `canEnter(10, false, true)` は `true`。スタッフ
- `canEnter(12, true, false)` は `true`。ちょうど 12 歳でチケットあり
- `canEnter(30, true, false)` は `true`
- `canEnter(30, false, false)` は `false`。チケットがない
- `canEnter(11, true, false)` は `false`。12 歳未満

**ヒント 1 日本語の手順**

```ts
export function isLeapYear(year: number): boolean {
  // もし year を 400 で割った余りが 0 と等しいなら
  //   true を返す
  // もし year を 100 で割った余りが 0 と等しいなら
  //   false を返す
  // year を 4 で割った余りが 0 と等しいかどうか（true か false）を返す
}

export function hasText(text: string): boolean {
  // text の前後の空白を取り除いた文字列の文字数が 0 より大きいかどうか（true か false）を返す
}

export function canEnter(age: number, hasTicket: boolean, isStaff: boolean): boolean {
  // isStaff が true、または（hasTicket が true、かつ age が 12 以上）かどうか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

`isLeapYear` は、400、100、4 の順に確かめます。決まりの「ただし」を先に片付けると、`if` の中で `return` するだけで書けます。`hasText` は問12 の反対です。`canEnter` の日本語のかっこは、コードでも `( )` で囲みます（問15 と同じ）。

