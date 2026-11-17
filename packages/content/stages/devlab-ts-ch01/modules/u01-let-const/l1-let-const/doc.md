---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-annotation, SRC-typescriptbook-functions-function-declaration, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-string]
---

# レッスン1-1 letとconst

## このレッスンの目標

- [ ] 関数の引数・戻り値・型注釈と、テストで確かめる値を読める
- [ ] const で値に名前を付け、計算結果や切り捨て・切り上げの結果を説明できる
- [ ] 余りを求め、テンプレートリテラルに値を埋め込む例を読める

## 1-1-1 問題の読み方

> **関数の形とテストの値を読むと、中に書く処理の入口と出口が分かります。**

関数は、値を受け取り、処理して、値を返すまとまりです。
注文数を受け取り、同じ数を返す簡単な関数を読んでみます。

```ts
// 注文数を受け取り、その数を返す関数を作る
export function confirmedQuantity(quantity: number): number {
  // 受け取った数を返す
  return quantity;
  // 関数の中身はここまで
}
// 3 を渡して関数を呼び、戻り値を表示する
console.log(confirmedQuantity(3));
// 結果: 3
```

- `export` は、別のファイルから使えるようにする印です。課題ではテストが関数を呼びます。
- `function` は、ここから関数を作る印です。その後ろが関数名です。
- `quantity` は引数です。受け取る値に付けた名前を指します。
- `: number` は型注釈です。型は値の種類で、number は数値を表します。
- かっこの中の型は引数、かっこの後ろの型は戻り値の種類です。戻り値は返す値のことです。
- `{` から `}` までが中身です。`return` は右の値を返して、関数を終えます。

`confirmedQuantity(3)` と呼ぶと、引数 quantity に `3` が入ります。
`return quantity;` により、呼んだ場所に `3` が戻ります。
`console.log` は、値を表示して確かめるために使っています。
行頭の `//` から先はコメントで、処理の説明を書く場所です。

よくある間違いは、数値の `3` を文字列の `"3"` と混同することです。
文字列は文字を並べた値で、引用符で囲んで書きます。
数値を受け取る引数に文字列を渡すと、型のエラーになります。

問題では、まず関数名と引数・戻り値の型を読みます。
次に「テストで確かめる値」を読み、渡す値と期待される結果を結び付けます。
問1では `addTax(1000)` は `1100`、`addTax(980)` は `1078`、`addTax(5)` は `5` です。
外側の名前や型を保ち、`// ここに書く` の場所に処理を書きます。

参考: サバイバルTypeScript [型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)・[関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)。説明と例は教材用に独自作成しています。

## 1-1-2 値に名前を付ける

> **const で値に名前を付けると、計算した結果も名前に入れて使えます。**

名前で値を使えるようにしたものを「変数」と呼びます。
価格や送料に名前を付けると、金額の計算を読みやすくできます。

```ts
// 価格 price を作り、1200 を入れる
const price = 1200;
// 送料 shipping を作り、500 を入れる
const shipping = 500;
// 価格と送料を足した合計 total を作る
const total = price + shipping;
// 合計を表示する
console.log(total);
// 結果: 1700
```

`=` は、右の値を左の名前に入れる印です。この操作を「代入」と呼びます。
右側が先に計算されるので、`total` には `1700` が入ります。
掛け算は `*` で書き、`price * 3` は `3600` になります。
const で作った名前には、あとから別の値を入れ直せません。

```ts
// 100 円ごとのポイント数を作る
const points = Math.floor(1980 / 100);
// ポイント数を表示する
console.log(points);
// 結果: 19
```

割り算は `/` で書きます。まず `1980 / 100` が `19.8` になります。
Math.floor は、その数以下で最も大きい整数にします。
この例のような正の数では、小数点以下を捨てて `19` になります。
四捨五入ではないので、`20` にはなりません。

説明とコード例は教材用に独自作成しています。問1の解答コードは載せていません。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-3 割り算と切り上げ

> **割り算の結果を Math.ceil に渡すと、大きい側の整数へ切り上げられます。**

割り算は `/` で書きます。`7 / 2` は `3.5` です。
整数どうしで割っても、小数が出ます。
箱の数のように、端数が出たら一つ多く必要なときは切り上げます。

```ts
// 箱の数 boxes を作り、25 を 12 で割って切り上げる
const boxes = Math.ceil(25 / 12);
// 箱の数を表示する
console.log(boxes);
// 結果: 3
```

`25 / 12` は約 `2.08` で、数直線では `2` と `3` の間です。
Math.ceil は、その数以上で最も小さい整数にします。この場合は `3` です。
Math.floor は、その数以下で最も大きい整数にします。この場合は `2` です。
どちらも、もとの数が整数なら変わりません。

よくある間違いは、必要な箱数を Math.floor で切り捨てることです。
2 箱では 24 本までしか入らず、1 本が残ります。
また、足し算と割り算を並べると、割り算が先に計算されます。
`800 + 400 / 2` は `800 + 200` となり、`1000` です。
送料込みの金額を 2 人で払うなら、合計を先に作ってから割ります。

```ts
// 送料込みの合計 total を作り、800 と 400 を足す
const total = 800 + 400;
// 1 人分 share を作り、合計を 2 で割る
const share = total / 2;
// 1 人分の金額を表示する
console.log(share);
// 結果: 600
```

問2 は、1 人分を 100 円単位に切り上げる練習です。
問4 は、合計を先に作ってから割る練習です。問4 では切り上げません。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。箱数と送料の例、丸めの補足は教材用に独自作成しています。

## 1-1-4 余りと文字の組み立て

> **余りを求め、テンプレートリテラルに値を埋め込むと、数を説明する文を作れます。**

`%` は割り算の余りを求める記号です。
14 個の卵を 4 個ずつ分けると、3 組できて 2 個残ります。
ここでは 0 以上の整数を、正の整数で割ります。
余りは `0` から割る数の手前までです。割り切れれば `0` です。

```ts
// 卵の数 eggs を作り、14 を入れる
const eggs = 14;
// 余り left を作り、eggs を 4 で割った余りを入れる
const left = eggs % 4;
// 余りを表示する
console.log(left);
// 結果: 2
```

文字列は、文字を並べた値です。型は `string` と書きます。
値を埋め込む書き方を、テンプレートリテラルと呼びます。
全体をバッククォートで囲み、`${式}` の場所に変数や計算を書きます。
式は、値を表すコードです。数値も文字として文に入ります。

```ts
// 商品名 item を作り、ノートを入れる
const item = "ノート";
// 冊数 count を作り、3 を入れる
const count = 3;
// 案内文 message を作り、商品名と冊数を埋め込む
const message = `${item}を${count}冊注文しました`;
// 案内文を表示する
console.log(message);
// 結果: ノートを3冊注文しました
```

バッククォートは、半角の記号です。
日本語配列のキーボードでは `Shift + @`、英語配列では数字の `1` の左のキーで入力します。

よくある間違いは、`%` を割合の計算だと考えることです。ここでは余りを求めます。
また、普通の引用符で `"${item}"` と書いても、値は埋め込まれません。
ドル記号や波かっこも、そのままの文字になります。
この課題では、`item + "を注文しました"` のような文字列の連結もエラーになります。
lint はコードが決まりに合うかを確かめる検査で、`prefer-template` の規則が働きます。
テンプレートリテラルで組み立てましょう。

問3 の戻り値は `string` です。時間と残りの分を文字列にします。
0 時間や 0 分のときも、`0` を書きます。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)。説明と例は教材用に独自作成しています。

## もっと知りたい人へ

- [サバイバルTypeScript: 型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)
- [サバイバルTypeScript: 関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)
- [サバイバルTypeScript: letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)
- [サバイバルTypeScript: number型](https://typescriptbook.jp/reference/values-types-variables/number)
- [サバイバルTypeScript: string型](https://typescriptbook.jp/reference/values-types-variables/string)

## 問題ごとのヒント

このレッスンの書き方で解く問題のヒントです。ほかの問題のヒントは、その書き方のレッスンにあります。

### 問 1 税込価格を返す

**テストで確かめる値**

- `addTax(1000)` は `1100`（税額は 100 円）
- `addTax(980)` は `1078`（税額は 98 円）
- `addTax(5)` は `5`（税額は 0.5 円。切り捨てると 0 円）

**ヒント 1 日本語の手順**

```ts
export function addTax(price: number): number {
  // 税額 tax を作り、price × 0.1 を切り捨てた数を入れる
  // price と tax を足した数を返す
}
```

**ヒント 2 コードへの直し方**

× は `*`、切り捨ては `Math.floor()` です。1 行目は、問1 のサンプルの `points` の行と同じ形です。

### 問 2 割り勘で 1 人が払う金額を返す

**テストで確かめる値**

- `splitBill(10000, 3)` は `3400`（1 人 3333.33… 円を、100 円単位に切り上げ）
- `splitBill(9000, 3)` は `3000`（割り切れるときは、そのまま）
- `splitBill(1000, 4)` は `300`（1 人 250 円を切り上げ）

**ヒント 1 日本語の手順**

```ts
export function splitBill(total: number, people: number): number {
  // 1 人分 perPerson を作り、total ÷ people を入れる
  // perPerson ÷ 100 を切り上げ、100 を掛けた数を返す
}
```

**ヒント 2 コードへの直し方**

÷ は `/`、切り上げは `Math.ceil()` です。100 で割ってから切り上げ、100 を掛けると、100 円単位の切り上げになります。

### 問 3 分を「◯時間◯分」の文字列にする

**テストで確かめる値**

- `minutesToText(125)` は `"2時間5分"`
- `minutesToText(60)` は `"1時間0分"`
- `minutesToText(45)` は `"0時間45分"`

**ヒント 1 日本語の手順**

```ts
export function minutesToText(minutes: number): string {
  // 時間 hours を作り、minutes ÷ 60 を切り捨てた数を入れる
  // 分 rest を作り、minutes を 60 で割った余りを入れる
  // hours と rest を埋め込んだ「◯時間◯分」の文字列を返す
}
```

**ヒント 2 コードへの直し方**

1 行目と 2 行目は、問3 のサンプルの `packs` と `left` の行と同じ形です。3 行目はテンプレートリテラルで作ります。

### 問 4 3 つの数の平均を返す

**テストで確かめる値**

- `average3(1, 2, 6)` は `3`（9 ÷ 3）
- `average3(10, 20, 30)` は `20`（60 ÷ 3）

**ヒント 1 日本語の手順**

```ts
export function average3(a: number, b: number, c: number): number {
  // 合計 total を作り、a と b と c を足した数を入れる
  // total ÷ 3 を返す
}
```

**ヒント 2 コードへの直し方**

`a + b + c / 3` と 1 行で書くと、`c / 3` が先に計算されます。合計を先に変数に入れておけば、この間違いは起きません。
