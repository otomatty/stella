---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-values-types-variables-truthy-falsy-values]
---
# レッスン6-1 q06 条件を組み合わせて返す

## このレッスンの目標

- [ ] 条件を組み合わせて真偽値を返せる
- [ ] よくある間違いを説明できる
- [ ] ヒントを読んで、一問ずつ確認して提出できる

実装は「01章の問題」の q06 のファイルで行います。
知識問題は理解の自己確認です。選考の判定には使いません。

## 6-1-1 条件を組み合わせて返す

> **比べた結果を組み合わせると、条件をそのまま返せます。**

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

正規表現は、探す文字の形を表す書き方です。
`/形/.test(文字列)` は、合う部分が含まれれば `true` を返します。
文字列全体が合う必要はありません。

| 形 | 探す文字 |
| --- | --- |
| `/\d/` | 数字一文字 |
| `/[A-Z]/` | 英大文字一文字 |
| `/[a-z]/` | 英小文字一文字 |
| `/\s/` | 空白一文字 |

```ts
// 予約番号 booking を作り、"R-24" を入れる
const booking = "R-24";
// 数字が含まれるかを hasNumber に入れる
const hasNumber = /\d/.test(booking);
// hasNumber を表示する
console.log(hasNumber);
// 結果: true
```

よくある間違いは、`/\d/` を「全部が数字」と考えることです。
`"R-24"` にも数字が含まれるので `true` です。
正規表現は、ここでは表の形をまねて書ければ十分です。

参考: サバイバルTypeScript [boolean](https://typescriptbook.jp/reference/values-types-variables/boolean)・[truthy-falsy-values](https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values)。説明・業務例・知識問題は教材用に構成しています。

## 問題ごとのヒント

### 問 1 0 より大きければ true を返す

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

### 問 2 0 より小さければ true を返す

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

### 問 3 奇数なら true を返す

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

### 問 4 13 歳以上 19 歳以下なら true を返す

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

### 問 5 土日なら true を返す

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

### 問 6 母音なら true を返す

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

### 問 7 逆の真偽値を返す

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

### 問 8 2 つとも true なら true を返す

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

### 問 9 どちらか 1 つでも true なら true を返す

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

### 問 10 どちらか片方だけが true なら true を返す

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

### 問 11 空の文字列なら true を返す

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

### 問 12 空の文字列か、空白だけなら true を返す

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

### 問 13 数字が含まれていれば true を返す

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

### 問 14 強いパスワードなら true を返す

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

### 問 15 2 つの数が同じ符号なら true を返す

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

### 問 16 買えるなら true を返す

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

### 問 17 3 の倍数か 5 の倍数なら true を返す

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

### 問 18 範囲の外なら true を返す

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

### 問 19 正しい名前なら true を返す

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

### 問 20 店が開いていれば true を返す

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

### 応用（総合） うるう年・空白以外の文字・会場に入れるか

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

