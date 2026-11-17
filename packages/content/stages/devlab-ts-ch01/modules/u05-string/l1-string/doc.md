---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
---
# レッスン5-1 q05 string型

## このレッスンの目標

- [ ] 先頭・末尾の一致と、見つかった位置の違いを説明できる
- [ ] 探す・取り出す・整える書き方を選べる
- [ ] 日本語の手順を一行ずつコードに直して試せる

動画でコードと値の動きを見たら、このまとめで書き方を読み直します。
知識問題は理解の自己確認です。選考の判定には使いません。
実装はステージ詳細の「01章の問題」を VS Code で開き、q05 の各ファイルに書きます。
この単元には課題を置いていません。
q01〜q04 までの書き方を使います。迷ったらその番号のガイドも読み返してください。

## 5-1-1 文字列を探す

> **探したい場所と、真偽か位置かに合わせて書き方を選びます。**

メソッドは、値に対する操作の名前です。名前の後ろにかっこを付けて呼びます。
先頭の一致には `startsWith`、末尾の一致には `endsWith` を使います。
結果は `true` か `false` です。途中の一致だけでは先頭や末尾の一致になりません。
問 6 と問 7 の新しい書き方を見比べてください。

```ts
// 注文番号 orderId を作り、"ORD-2025-001" を入れる
const orderId = "ORD-2025-001";
// isOrder を作り、orderId が "ORD-" で始まるか（true か false）を入れる
const isOrder = orderId.startsWith("ORD-");
// isOrder を表示する
console.log(isOrder);
// 結果: isOrder は true
```

```ts
// メールアドレス email を作り、"sato@example.co.jp" を入れる
const email = "sato@example.co.jp";
// isJapan を作り、email が ".jp" で終わるか（true か false）を入れる
const isJapan = email.endsWith(".jp");
// isJapan を表示する
console.log(isJapan);
// 結果: isJapan は true
```

位置が必要なら `indexOf` で最初、`lastIndexOf` で最後を探します。
位置は 0 から数え、どちらも見つからないと `-1` です。
0 は先頭で見つかった位置なので、見つからない場合と区別します。
よくある間違いは、0 を「見つからない」と考えることです。
`"SKU-0042".indexOf("S")` は `0`、`.indexOf("#")` は `-1` です。
問 11 と問 16 で使います。

```ts
// 商品コード code を作り、"SKU-0042" を入れる
const code = "SKU-0042";
// 位置 pos を作り、code の中で "-" がある位置（0 から数える）を入れる
const pos = code.indexOf("-");
// pos を表示する
console.log(pos);
// 結果: pos は 3
```

```ts
// 住所 address を作り、"東京都港区1-2-3" を入れる
const address = "東京都港区1-2-3";
// 位置 last を作り、address の中で最後の "-" がある位置を入れる
const last = address.lastIndexOf("-");
// last を表示する
console.log(last);
// 結果: last は 8
```

文字列の表記の背景は[サバイバルTypeScript「string型」](https://typescriptbook.jp/reference/values-types-variables/string)を参照してください。
ここでの操作の説明と業務サンプルは、書き方ガイドの内容です。

## 5-1-2 位置で取り出す

> **後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。**

文字の位置は、先頭を 0 として数えます。
予約番号 `"R-824"` なら、次のように対応します。

| 位置 | 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- | --- |
| 文字 | R | - | 8 | 2 | 4 |

`slice(始まり, 終わり)` は終わりの位置の文字を含みません。
`"R-824".slice(0, 2)` は `"R-"` です。位置 2 の `8` は含めません。
終わりを省くと末尾まで取り出します。
問 4 の `slice` に渡す負の数は、後ろから数えた位置です。
`-3` なら後ろから三文字目、`-1` なら最後の一文字の位置です。
このマイナスは引き算の式ではありません。

```ts
// 商品コード code を作り、"ABC-123" を入れる
const code = "ABC-123";
// 番号 num を作り、code の後ろから 3 文字を取り出したものを入れる
const num = code.slice(-3);
// num を表示する
console.log(num);
// 結果: num は "123"
```

問 19 の `charAt` は、0 から数えた位置の一文字を返します。
その位置に文字がないと、空の文字列 `""` を返します。
空の文字列は、文字が一つもない値です。
よくある間違いは、`charAt(-1)` で最後の文字を取ろうとすることです。
`charAt(-1)` も空の文字列です。`slice` の負の位置とは意味が違います。

```ts
// 部屋番号 room を作り、"B203" を入れる
const room = "B203";
// 建物 building を作り、room の 0 番目の文字を入れる
const building = room.charAt(0);
// building を表示する
console.log(building);
// 結果: building は "B"
```

文字列自体の書き方は[サバイバルTypeScript「文字列リテラル」](https://typescriptbook.jp/reference/values-types-variables/string#文字列リテラル)で確認できます。
位置から取り出す例は、書き方ガイドに合わせた教材のサンプルです。

## 5-1-3 整える・置き換える

> **空白や大文字小文字をそろえ、置き換える範囲を選びます。**

問 9 の `trim` は前後の空白だけを取り除きます。
よくある間違いは、途中の空白まで消えると思うことです。
途中の空白は残ります。入力されたメールアドレスなどを整えるときに使います。
問 7 の二つ目の項目にある `toLowerCase` は英字を小文字にします。
どちらも元の文字列を変えず、整えた文字列を返します。

```ts
// 入力 input を作り、"  sato@example.com  " を入れる
const input = "  sato@example.com  ";
// email を作り、input の前後の空白を取り除いたものを入れる
const email = input.trim();
// email を表示する
console.log(email);
// 結果: email は "sato@example.com"
```

```ts
// 部署コード dept を作り、"Sales-01" を小文字にしたものを入れる
const dept = "Sales-01".toLowerCase();
// dept を表示する
console.log(dept);
// 結果: dept は "sales-01"
```

問 10 の `replaceAll(探す文字列, 代わりの文字列)` は、一致をすべて置き換えます。
代わりの文字列を `""` にすると、その部分を取り除けます。

```ts
// 電話番号 phone を作り、"03-1234-5678" を入れる
const phone = "03-1234-5678";
// digits を作り、phone の "-" をすべて "" に置き換えたものを入れる
const digits = phone.replaceAll("-", "");
// digits を表示する
console.log(digits);
// 結果: digits は "0312345678"
```

問 18 の `replace` に文字列を渡すと、最初の一致だけを置き換えます。
よくある間違いは、`replace` に文字列を渡してすべて消えると思うことです。
下の例では、`first` の二つ目以降のハイフンは残ります。
正規表現は、探す文字の種類や並びを表す書き方です。
`/[0-9]/g` の `[0-9]` は数字一文字、`g` は一致をすべて扱う指定です。
`replace` にこの形を渡すと、数字をすべて置き換えられます。
ここではこの形をまねて書ければ十分です。詳しくは09章の発展問題で扱います。

```ts
// 商品コード code を作り、"A-1-B-2" を入れる
const code = "A-1-B-2";
// first を作り、code の最初の "-" だけを "" に置き換えたものを入れる
const first = code.replace("-", "");
// noDigits を作り、code の中の数字をすべて "" に置き換えたものを入れる
const noDigits = code.replace(/[0-9]/g, "");
// first を表示する
console.log(first);
// noDigits を表示する
console.log(noDigits);
// 結果: first は "A1-B-2"、noDigits は "A--B-"
```

文字列の型や表記の背景は[サバイバルTypeScript「string型」](https://typescriptbook.jp/reference/values-types-variables/string)を参照してください。
メソッドの説明と業務サンプルは、書き方ガイドに合わせています。

## もっと知りたい人へ

[サバイバルTypeScript「string型」](https://typescriptbook.jp/reference/values-types-variables/string)は、文字列の型注釈とテンプレートリテラルの背景資料です。
メソッドの説明と業務サンプル、日本語のヒントは、このリポジトリの「書き方ガイド」01章 q05 に合わせています。
サンプルは課題の解答ではありません。
[サバイバルTypeScript「テンプレートリテラル」](https://typescriptbook.jp/reference/values-types-variables/string#テンプレートリテラル)も参照できます。
q05 で文字列を組み立てるときは、`+` を使わずにテンプレートリテラルで書きます。

読み直したら知識問題で確かめ、ステージ詳細の「01章の問題」から VS Code で q05 を解いてください。

## 問題ごとのヒント

ヒント 1 は、日本語の手順だけを入れた骨組みです。
一行ずつコードに直してください。
ヒント 2 は、手順に合う書き方を案内します。

### 問 1 文字数を返す

**テストで確かめる値**

- `lengthOf("Agora")` → `5`
- `lengthOf("")` → `0`（空の文字列は 0 文字）

**ヒント 1 日本語の手順**

```ts
export function lengthOf(text: string): number {
  // text の文字数を返す
}
```

**ヒント 2 コードへの直し方**

文字数は `.length` です（q02 問13）。`.length` にはかっこを付けません。

### 問 2 英字を大文字にする

**テストで確かめる値**

- `toUpper("abc")` → `"ABC"`
- `toUpper("Type1")` → `"TYPE1"`（数字は変わらない）

**ヒント 1 日本語の手順**

```ts
export function toUpper(text: string): string {
  // text の英字を大文字にしたものを返す
}
```

**ヒント 2 コードへの直し方**

大文字にするのは `.toUpperCase()` です（q02 問18）。

### 問 3 最初の 3 文字を返す

**テストで確かめる値**

- `firstThree("TypeScript")` → `"Typ"`
- `firstThree("ab")` → `"ab"`（2 文字しかない）

**ヒント 1 日本語の手順**

```ts
export function firstThree(text: string): string {
  // text の 0 文字目から 3 文字目の前までを取り出して返す
}
```

**ヒント 2 コードへの直し方**

一部を取り出すのは `.slice(始まり, 終わり)` です（q02 問10）。終わりの位置の文字は含みません。文字数が足りなくても、エラーにならずにあるだけを返します。

### 問 4 最後の 1 文字を返す

**テストで確かめる値**

- `lastChar("hello")` → `"o"`
- `lastChar("")` → `""`（空の文字列）

**ヒント 1 日本語の手順**

```ts
export function lastChar(text: string): string {
  // text の後ろから 1 文字を取り出して返す
}
```

**ヒント 2 コードへの直し方**

問4 のサンプルの `num` の行と同じ形で、取り出す文字数だけが違います。`.slice()` は、空の文字列に使っても空の文字列を返します。

### 問 5 text に word が含まれていれば true を返す

**テストで確かめる値**

- `hasWord("I like TypeScript", "Type")` → `true`
- `hasWord("I like TypeScript", "Java")` → `false`

**ヒント 1 日本語の手順**

```ts
export function hasWord(text: string, word: string): boolean {
  // text に word が含まれるか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

「含まれるか」は `.includes()` です（q01 問16）。結果がそのまま `true` か `false` なので、`if` は要りません。

### 問 6 「#」で始まっていれば true を返す

**テストで確かめる値**

- `isHashtag("#agora")` → `true`
- `isHashtag("agora#")` → `false`（# が最後にある）

**ヒント 1 日本語の手順**

```ts
export function isHashtag(text: string): boolean {
  // text が "#" で始まるか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

問6 のサンプルの `isOrder` の行と同じ形です。調べる文字列が `"#"` になります。

### 問 7 ファイル名が「.png」で終わっていれば true を返す

**テストで確かめる値**

- `isPng("photo.png")` → `true`
- `isPng("photo.PNG")` → `true`（大文字でも true）
- `isPng("photo.jpg")` → `false`

**ヒント 1 日本語の手順**

```ts
export function isPng(fileName: string): boolean {
  // fileName を小文字にしたものが ".png" で終わるか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

先に小文字にしてから調べると、`".PNG"` も `".png"` と同じに扱えます。`.toLowerCase()` の結果に、続けて `.endsWith()` を呼びます。

### 問 8 番号を 4 桁になるように前を 0 で埋める

**テストで確かめる値**

- `padId(7)` → `"0007"`
- `padId(1234)` → `"1234"`（もう 4 桁）

**ヒント 1 日本語の手順**

```ts
export function padId(id: number): string {
  // id を文字列にして前を "0" で埋め、4 文字にしたものを返す
}
```

**ヒント 2 コードへの直し方**

q01 問20 のヒントの `pad` と同じ形で、文字数だけが違います。文字列にするのは `String()`、前を埋めるのは `.padStart()` です。

### 問 9 前後の空白を取り除き、英字を小文字にする

**テストで確かめる値**

- `normalize("  Hello ")` → `"hello"`
- `normalize("ABC")` → `"abc"`（空白がなくても小文字にする）

**ヒント 1 日本語の手順**

```ts
export function normalize(text: string): string {
  // text の前後の空白を取り除き、小文字にしたものを返す
}
```

**ヒント 2 コードへの直し方**

`.trim()` の結果に、続けて `.toLowerCase()` を呼びます。問7 のヒントと同じく、メソッドを左から順につなげます。

### 問 10 半角スペースをすべて「_」に置き換える

**テストで確かめる値**

- `snakeSpaces("a b c")` → `"a_b_c"`
- `snakeSpaces("abc")` → `"abc"`（スペースがない）

**ヒント 1 日本語の手順**

```ts
export function snakeSpaces(text: string): string {
  // text の " " をすべて "_" に置き換えたものを返す
}
```

**ヒント 2 コードへの直し方**

問10 のサンプルの `digits` の行と同じ形です。探す文字列が `" "`、代わりに入れる文字列が `"_"` になります。

### 問 11 「@」が何文字目にあるかを返す

**テストで確かめる値**

- `atPosition("taro@example.com")` → `4`（t が 0、a が 1、r が 2、o が 3、@ が 4）
- `atPosition("example.com")` → `-1`（@ がない）

**ヒント 1 日本語の手順**

```ts
export function atPosition(email: string): number {
  // email の中で "@" がある位置（0 から数える）を返す
}
```

**ヒント 2 コードへの直し方**

問11 のサンプルの `pos` の行と同じ形です。`.indexOf()` は見つからないときに `-1` を返すので、そのまま返せば「なければ -1」も満たします。

### 問 12 最初の 1 文字だけを大文字にする

**テストで確かめる値**

- `capitalize("hello")` → `"Hello"`
- `capitalize("a")` → `"A"`（1 文字だけ）
- `capitalize("")` → `""`（空の文字列）

**ヒント 1 日本語の手順**

```ts
export function capitalize(text: string): string {
  // 先頭 head を作り、text の 0 文字目から 1 文字目の前までを取り出して大文字にしたものを入れる
  // 残り rest を作り、text の 1 文字目から後ろを取り出したものを入れる
  // head と rest を埋め込んだ文字列を返す
}
```

**ヒント 2 コードへの直し方**

`.slice(0, 1)` は先頭の 1 文字、`.slice(1)` は 1 文字目から最後までです。空の文字列でも `.slice()` は空の文字列を返します。`text[0]` を使うと、型の確認で「`undefined` かもしれない」というエラーになります。

### 問 13 text の前後に mark を付ける

**テストで確かめる値**

- `surround("注意", "**")` → `"**注意**"`
- `surround("x", "")` → `"x"`（mark が空）

**ヒント 1 日本語の手順**

```ts
export function surround(text: string, mark: string): string {
  // mark、text、mark を埋め込んだ文字列を返す
}
```

**ヒント 2 コードへの直し方**

「埋め込んだ文字列」はテンプレートリテラルで作ります（q01 問3）。`${ }` を 3 つ並べます。

### 問 14 前から読んでも後ろから読んでも同じなら true を返す

**テストで確かめる値**

- `isPalindrome("level")` → `true`
- `isPalindrome("しんぶんし")` → `true`
- `isPalindrome("agora")` → `false`（逆にすると "aroga"）

**ヒント 1 日本語の手順**

```ts
export function isPalindrome(text: string): boolean {
  // 逆順 reversed を入れ直せる変数として作り、空の文字列を入れる
  // text から 1 文字ずつ c に取り出してくり返す
  //   c の後ろに reversed をつなげた文字列を、reversed に入れ直す
  // text と reversed が等しいか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

逆順を作る部分は、q01 問10 と同じ形です。「等しいか」は `===` で、結果がそのまま `true` か `false` になります。

### 問 15 電話番号の真ん中の 4 桁を「****」にする

**テストで確かめる値**

- `maskPhone("090-1234-5678")` → `"090-****-5678"`
- `maskPhone("080-0000-1111")` → `"080-****-1111"`

**ヒント 1 日本語の手順**

```ts
export function maskPhone(phone: string): string {
  // phone の 0 文字目から 4 文字目の前まで、"****"、8 文字目から後ろを埋め込んだ文字列を返す
}
```

**ヒント 2 コードへの直し方**

「0 文字目から 4 文字目の前まで」は `.slice(0, 4)`、「8 文字目から後ろ」は `.slice(8)` です。それぞれを、テンプレートリテラルの `${ }` に入れます。

### 問 16 ファイル名の拡張子を返す

**テストで確かめる値**

- `extension("photo.jpeg")` → `"jpeg"`
- `extension("archive.tar.gz")` → `"gz"`（最後の "." より後ろ）
- `extension("README")` → `""`（"." がない）

**ヒント 1 日本語の手順**

```ts
export function extension(fileName: string): string {
  // 位置 dot を作り、fileName の中で最後の "." がある位置を入れる
  // dot が -1 と等しいなら空の文字列、そうでなければ fileName の dot + 1 文字目から後ろを取り出したものを返す
}
```

**ヒント 2 コードへの直し方**

1 行目は問16 のサンプルの `last` の行と同じ形です。2 行目は条件演算子 `? :`（q01 問12）で書きます。`"."` の 1 つ後ろから取り出すので、`.slice()` には `dot + 1` を渡します。

### 問 17 時と分を「09:05」の形にする

**テストで確かめる値**

- `clockText(9, 5)` → `"09:05"`
- `clockText(23, 59)` → `"23:59"`

**ヒント 1 日本語の手順**

```ts
export function clockText(hour: number, minute: number): string {
  // 時 h を作り、hour を文字列にして前を "0" で埋め、2 文字にしたものを入れる
  // 分 m を作り、minute を文字列にして前を "0" で埋め、2 文字にしたものを入れる
  // h と m を ":" でつないだ文字列を返す
}
```

**ヒント 2 コードへの直し方**

1 行目と 2 行目は、問8 と同じく `String()` と `.padStart()` です。最後の行はテンプレートリテラルで作ります。

### 問 18 英字の母音を取り除く

**テストで確かめる値**

- `removeVowels("typescript")` → `"typscrpt"`（e と i を取り除く）
- `removeVowels("aeiou")` → `""`（全部が母音）

**ヒント 1 日本語の手順**

```ts
export function removeVowels(text: string): string {
  // text の中の母音（a、e、i、o、u）をすべて "" に置き換えたものを返す
}
```

**ヒント 2 コードへの直し方**

問18 のサンプルの `noDigits` の行と同じ形です。`[ ]` の中を、数字から母音の 5 文字に変えます。`.replaceAll()` を 5 回続けて呼んでもかまいません。

### 問 19 index 番目の文字を返す

**テストで確かめる値**

- `charAtOrEmpty("abc", 1)` → `"b"`（a が 0、b が 1）
- `charAtOrEmpty("abc", 5)` → `""`（5 番目はない）

**ヒント 1 日本語の手順**

```ts
export function charAtOrEmpty(text: string, index: number): string {
  // text の index 番目の文字を返す
}
```

**ヒント 2 コードへの直し方**

問19 のサンプルの `building` の行と同じ形です。`.charAt()` は文字がない位置で空の文字列を返すので、`if` は要りません。

### 問 20 大文字と小文字の違いを無視して比べる

**テストで確かめる値**

- `sameIgnoringCase("Agora", "AGORA")` → `true`
- `sameIgnoringCase("Agora", "Agola")` → `false`（r と l が違う）

**ヒント 1 日本語の手順**

```ts
export function sameIgnoringCase(a: string, b: string): boolean {
  // a を小文字にしたものと、b を小文字にしたものが等しいか（true か false）を返す
}
```

**ヒント 2 コードへの直し方**

両方を `.toLowerCase()`（問7）でそろえてから、`===` で比べます。

### 応用 URL の形・文字数の切りつめ・メールアドレスを隠す

**テストで確かめる値**

- `slugify("Hello World")` → `"hello-world"`
- `slugify("  Hello TypeScript   World ")` → `"hello-typescript-world"`（空白が続いてもハイフン 1 つ）
- `slugify("agora")` → `"agora"`
- `truncate("TypeScript入門", 6)` → `"TypeS…"`（5 文字と "…" で 6 文字）
- `truncate("abcdefg", 6)` → `"abcde…"`
- `truncate("短い文", 10)` → `"短い文"`（max 以下はそのまま）
- `truncate("abcdef", 6)` → `"abcdef"`（ちょうど max 文字もそのまま）
- `truncate("abc", 0)` → `Error`（Error を投げる）
- `maskEmail("taro@example.com")` → `"t***@example.com"`
- `maskEmail("a@b.jp")` → `"a***@b.jp"`
- `maskEmail("example.com")` → `Error`（"@" がない）
- `maskEmail("@example.com")` → `Error`（"@" より前が空）

**ヒント 1 日本語の手順**

```ts
export function slugify(title: string): string {
  // title の前後の空白を取り除き、小文字にし、空白の並びをすべて "-" に置き換えたものを返す
}

export function truncate(text: string, max: number): string {
  // もし max が 1 より小さいなら
  //   Error を投げる
  // もし text の文字数が max 以下なら
  //   text を返す
  // text の 0 文字目から max - 1 文字目の前までと、"…" を埋め込んだ文字列を返す
}

export function maskEmail(email: string): string {
  // 位置 at を作り、email の中で "@" がある位置を入れる
  // もし at が 0 以下なら
  //   Error を投げる
  // email の先頭 1 文字、"***"、at 文字目から後ろを埋め込んだ文字列を返す
}
```

**ヒント 2 コードへの直し方**

`slugify` は、`.trim()`・`.toLowerCase()`・`.replace(/\s+/g, "-")` を左から順につなげます。`truncate` の「Error を投げる」は `throw new Error("…")` です（q04）。`"…"` も 1 文字なので、残す文字数は `max - 1` です。`maskEmail` の `at` は、`"@"` がなければ `-1`、先頭にあれば `0` になります。どちらも「0 以下」で見分けられます。
