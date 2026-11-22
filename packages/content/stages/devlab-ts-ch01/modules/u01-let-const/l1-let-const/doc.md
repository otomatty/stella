---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-annotation, SRC-typescriptbook-functions-function-declaration, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-string]
---

# レッスン1-1 letとconst

## このレッスンの目標

- [ ] 関数の引数・戻り値・型注釈を読み、関数を呼び出す 1 行を説明できる
- [ ] const で値に名前を付け、計算結果や切り捨て・切り上げの結果を説明できる
- [ ] 余りを求め、テンプレートリテラルに値を埋め込む例を読める

## 1-1-1 関数のしくみ

> **関数は、値を受け取り、決まった処理をして、値を返すまとまりです。**

関数は、値を受け取り、決まった処理をして、値を返すまとまりです。
本の値段を受け取り、送料を足した金額を返す関数を読んでみます。

```ts
// 本の値段を受け取り、支払う金額を返す関数
function addShipping(price: number): number {
  // 受け取った値段に、送料の 500 を足して返す
  return price + 500;
}
```

- `function` は、ここから関数を作る印です。その後ろの `addShipping` が関数名です。
- 関数名は自分で付けます。add は足す、shipping は送料という意味の英語です。
- かっこの中の `price` は引数です。引数は、関数が受け取る値のことです。
- `{` から `}` までが関数の中身です。ここに処理を書きます。
- `return` は、右の値を返す命令です。関数が返す値を戻り値と呼びます。

この関数が `1200` を受け取ると、`500` を足した `1700` を返します。
`800` を受け取れば、返すのは `1300` です。処理はいつも同じです。

`function` や `return`、かっこなどの記号は、言語で決まっている書き方です。
関数名・引数名・足す数の `500` は、書く人が自分で決めます。
行頭の `//` から先はコメントで、処理の説明を書く場所です。

問題では、関数の外側が最初から書いてあります。`// ここに書く` の場所に処理を書きます。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)。

## 1-1-2 型注釈の書き方

> **型注釈は、値の種類をコロンの後ろに書く書き方です。**

値には種類があり、プログラムでは値の種類を「型」と呼びます。
型注釈は、値の種類をコロンの後ろに書く書き方です。

```ts
// 本の値段を受け取り、支払う金額を返す関数
function addShipping(price: number): number {
  // 受け取った値段に、送料の 500 を足して返す
  return price + 500;
}
```

- `price: number` は、引数 price が数値だという型注釈です。number は数値を表す型です。
- かっこの後ろの `: number` は、戻り値が数値だという型注釈です。
- 引数の型はかっこの中、戻り値の型はかっこの後ろに書きます。

値の種類は、数値だけではありません。文字を表す型は `string` と書きます。
この関数が受け取るのは本の値段という金額なので、数値の `number` を選んでいます。

型注釈を書いておくと、種類の合わない値を渡したときにエラーで知らされます。
`number` や `string` は言語で決まっている書き方で、つづりを変えられません。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-3 関数を呼び出す

> **関数は、名前の後ろのかっこに値を書いて呼び出すと動きます。**

関数は、書いただけでは動きません。呼び出して初めて動きます。
呼び出すには、関数の名前の後ろにかっこを書き、その中に渡す値を書きます。

```ts
// 本の値段を受け取り、支払う金額を返す関数
function addShipping(price: number): number {
  // 受け取った値段に、送料の 500 を足して返す
  return price + 500;
}
// 1200 円の本の値段を渡して関数を呼び、戻り値を表示する
console.log(addShipping(1200));
// 結果: 1700
// 800 円の本の値段を渡して、もう一度呼ぶ
console.log(addShipping(800));
// 結果: 1300
```

- `addShipping(1200)` と書くと、`1200` が引数 price に入ります。
- 関数の中で `500` が足され、戻り値の `1700` が呼び出した場所に戻ります。
- 渡す値を変えれば、同じ関数を何度でも使えます。
- `console.log` は、値を表示して確かめるために使っています。

問題の関数には、先頭に `export` が付いています。
`export` は、ほかのファイルからその関数を呼び出せるようにする印です。
課題では確認用のプログラムが関数を呼び出すので、自分で呼び出しの行を書く必要はありません。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)。

## 1-1-4 値に名前を付ける

> **const で変数を作ると、値に名前が付き、その名前で値を使えます。**

名前を付けた値の入れ物を「変数」と呼びます。
送料に名前を付けると、何の数なのかがコードから読み取れます。

```ts
// 送料 shipping を作り、500 を入れる
const shipping = 500;
// 送料を表示する
console.log(shipping);
// 結果: 500
```

- `const` は、変数を作る印です。
- `shipping` は、自分で考えて付けた名前です。送料という意味の英語です。
- `=` は、右の値を左の変数に入れる印です。この操作を「代入」と呼びます。等しいという意味ではありません。
- 最後の `;` は、文の終わりを表します。

変数は、関数の中でも作れます。

```ts
// 本の値段を受け取り、支払う金額を返す関数を作る
function addShipping(price: number): number {
  // 送料 shipping を作り、500 を入れる
  const shipping = 500;
  // 値段に送料を足して返す
  return price + shipping;
}
// 1200 を渡して関数を呼び、戻り値を表示する
console.log(addShipping(1200));
// 結果: 1700
```

const で作った変数には、あとから別の値を入れ直せません。

説明とコード例は教材用に独自作成しています。問1の解答コードは載せていません。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-5 計算した結果を入れる

> **イコールの右側が先に計算され、その結果が変数に入ります。**

値だけでなく、計算した結果にも名前を付けられます。
`1200 + 500` のような計算の書き方を「式」と呼びます。

```ts
// 合計 total を作り、1200 と 500 を足した結果を入れる
const total = 1200 + 500;
// 合計を表示する
console.log(total);
// 結果: 1700
```

イコールの右側の式が、先に計算されます。
変数 total に入るのは、式そのものではなく、結果の `1700` です。

式には、変数も書けます。

```ts
// 価格 price を作り、1200 を入れる
const price = 1200;
// 送料 shipping を作り、500 を入れる
const shipping = 500;
// 合計 total を作り、足した結果を入れる
const total = price + shipping;
// 合計を表示する
console.log(total);
// 結果: 1700
```

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-6 掛け算の書き方

> **掛け算は、アスタリスクという記号で書きます。**

掛け算は、`*` という記号で書きます。この記号をアスタリスクと呼びます。
算数で使うかける記号 `×` は、コードでは使いません。

```ts
// 3 冊分の金額 cost を作り、1200 に 3 を掛けた結果を入れる
const cost = 1200 * 3;
// 金額を表示する
console.log(cost);
// 結果: 3600
```

`1200 * 3` が先に計算され、結果の `3600` が cost に入ります。

小数を掛けるときも、同じ記号で書きます。

```ts
// 半額の金額 half を作り、800 に 0.5 を掛けた結果を入れる
const half = 800 * 0.5;
// 金額を表示する
console.log(half);
// 結果: 400
```

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-7 小数点以下を切り捨てる

> **Math.floor を使うと、小数点以下を切り捨てた整数になります。**

小数点から下を捨てて整数にすることを、「切り捨て」と呼びます。
切り捨てには、最初から用意されている関数 Math.floor を使います。

```ts
// ポイント points を作り、19.8 を切り捨てた結果を入れる
const points = Math.floor(19.8);
// ポイントを表示する
console.log(points);
// 結果: 19
```

かっこの中に渡した数の、小数点から下が捨てられます。
四捨五入ではないので、`19.8` は `20` ではなく `19` になります。

計算した結果を、そのまま渡すこともできます。

```ts
// 切り捨てる前の数 raw を作り、1980 の 1% を入れる
const raw = 1980 * 0.01;
// ポイント points を作り、切り捨てた結果を入れる
const points = Math.floor(raw);
// ポイントを表示する
console.log(points);
// 結果: 19
```

この例のような正の数では、Math.floor は小数点以下を捨てた整数を返します。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-8 割り算の書き方

> **割り算は、スラッシュという記号で書きます。**

割り算は、スラッシュという記号 `/` で書きます。
12 枚のクッキーを 3 人で分けるときの 1 人分は、次のように計算できます。

```ts
// 1 人分 each を作り、12 を 3 で割る
const each = 12 / 3;
// 1 人分を表示する
console.log(each);
// 結果: 4
```

- `/` がスラッシュです。キーボードに算数の割る記号が無いので、代わりにこの記号を使います。
- `12 / 3` が先に計算され、結果の `4` が変数 each に入ります。

割り切れないときは、結果が小数になります。

```ts
// 1 人分 each を作り、7 を 2 で割る
const each = 7 / 2;
// 1 人分を表示する
console.log(each);
// 結果: 3.5
```

整数どうしで割っても、端数が勝手に切り捨てられることはありません。
整数にしたいときは、Math.floor で切り捨てるか、次のトピックの切り上げを使います。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-9 小数点以下を切り上げる

> **Math.ceil を使うと、小数点以下を切り上げた整数になります。**

Math.ceil は、小数点以下を切り上げた整数を返します。
箱の数のように、端数が出たら 1 つ多く必要なときに使います。

```ts
// 箱の数 boxes を作り、2.5 を切り上げる
const boxes = Math.ceil(2.5);
// 箱の数を表示する
console.log(boxes);
// 結果: 3
```

25 本の瓶を 10 本入りの箱に詰めると、25 ÷ 10 で 2.5 箱です。
2 箱では 20 本までしか入らないので、残りの 5 本のためにもう 1 箱が必要です。

- `Math.ceil(2.5)` は `3` を返します。その数以上で最も小さい整数です。
- `Math.floor(2.5)` は `2` を返します。その数以下で最も大きい整数です。
- もとの数が整数なら、どちらを使っても変わりません。
- 四捨五入ではありません。`Math.ceil(2.1)` も `3` です。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-10 引数を2つ受け取る

> **引数は、カンマで区切って2つ以上受け取れます。**

引数は、カンマで区切って 2 つ以上受け取れます。
切符の料金と枚数を受け取り、合計の金額を返す関数を読んでみます。

```ts
// 料金と枚数を受け取り、合計の金額を返す関数
function ticketTotal(fare: number, count: number): number {
  // 料金に枚数を掛けて返す
  return fare * count;
}
// 200 円の切符を 3 枚で関数を呼び、戻り値を表示する
console.log(ticketTotal(200, 3));
// 結果: 600
```

- かっこの中の `fare: number, count: number` が、2 つの引数です。間をカンマで区切ります。
- どの引数にも、型注釈を書きます。戻り値は 1 つなので、かっこの後ろの型注釈も 1 つです。
- 呼び出すときも、渡す値をカンマで区切ります。
- 渡した順番のとおりに入ります。`200` が fare、`3` が count です。

割り算のように順番で結果が変わる計算では、渡す順番を間違えると答えが変わります。
引数は 3 つ以上にもできます。問4 の関数は、引数を 3 つ受け取ります。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)。

## 1-1-11 文字列の書き方

> **文字は引用符で囲んで書き、その種類を string と呼びます。**

名前や住所のような文字は、引用符で囲んで書きます。
引用符で囲んだ値を「文字列」と呼び、その種類は string です。

```ts
// 名前を受け取り、その名前を返す関数
function customerName(name: string): string {
  // 受け取った名前をそのまま返す
  return name;
}
// 田中という名前を渡して関数を呼び、戻り値を表示する
console.log(customerName("田中"));
// 結果: 田中
```

- `"田中"` は文字列です。囲んでいる記号 `"` をダブルクォートと呼びます。
- `name: string` は、引数 name が文字列だという型注釈です。
- かっこの後ろの `string` は、戻り値も文字列だという意味です。

数値の `3` と、文字列の `"3"` は別の値です。
number の引数に文字列を渡すと、型のエラーになります。

```ts
// 個数を受け取り、その数を返す関数
function orderCount(count: number): number {
  // 受け取った個数をそのまま返す
  return count;
}
// 数値の 3 は渡せる
orderCount(3);
// 文字列の 3 は渡せない
orderCount("3");
// エラー: string 型の値は number 型の引数に渡せません
```

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)・[型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)。

## 1-1-12 余りの求め方

> **割り算の余りは、パーセントという記号で求めます。**

`%` は、割り算の余りを求める記号です。ここでは割合という意味では使いません。
14 個の卵を 4 個ずつパックに詰めると、3 パックできて 2 個残ります。

```ts
// 余り left を作り、14 を 4 で割った余りを入れる
const left = 14 % 4;
// 余りを表示する
console.log(left);
// 結果: 2
```

ここでは 0 以上の整数を、正の整数で割ります。
余りは `0` から割る数の手前までです。割り切れれば `0` です。

割り算と組み合わせると、何パックできて何個残るかが分かります。

```ts
// パックの数 packs を作る
const packs = Math.floor(14 / 4);
// 残りの数 left を作る
const left = 14 % 4;
// パックの数と残りの数を表示する
console.log(packs, left);
// 結果: 3 2
```

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。

## 1-1-13 文字列に値を埋め込む

> **テンプレートリテラルを使うと、文字列の中に値を埋め込めます。**

値を埋め込める文字列の書き方を、テンプレートリテラルと呼びます。
全体をバッククォートで囲み、`${式}` の場所に変数や計算を書きます。

```ts
// 冊数 count を作り、3 を入れる
const count = 3;
// 案内文 message を作り、冊数を埋め込む
const message = `ノートを${count}冊注文しました`;
// 案内文を表示する
console.log(message);
// 結果: ノートを3冊注文しました
```

- `${count}` の部分が、変数 count の値の `3` に置きかわります。
- 数値も、文字として文の中に入ります。
- 値を入れる場所は、1 つの文字列にいくつでも書けます。

バッククォートは、半角の記号です。
日本語配列のキーボードでは `Shift + @`、英語配列では数字の `1` の左のキーで入力します。

普通の引用符で `"${count}"` と書いても、値は埋め込まれません。ドル記号や波かっこも、そのままの文字になります。
この課題では、`item + "を注文しました"` のような文字列の連結もエラーになります。
lint はコードが決まりに合うかを確かめる検査で、`prefer-template` の規則が働きます。

問3 の戻り値は `string` です。時間と残りの分を文字列にします。
0 時間や 0 分のときも、`0` を書きます。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)。

## 1-1-14 計算の順番

> **掛け算と割り算は、足し算より先に計算されます。**

掛け算と割り算は、足し算より先に計算されます。算数と同じ決まりです。
800 円の品物と 400 円の送料を 2 人で払うとき、1 行で書くと結果が変わります。

```ts
// 1 人分 share を作る（順番を考えていない書き方）
const share = 800 + 400 / 2;
// 1 人分を表示する
console.log(share);
// 結果: 1000
```

`400 / 2` が先に計算され、その `200` に `800` が足されるからです。
先に足したいときは、合計を変数に入れてから割ります。

```ts
// 合計 total を作り、800 と 400 を足す
const total = 800 + 400;
// 1 人分 share を作り、合計を 2 で割る
const share = total / 2;
// 1 人分を表示する
console.log(share);
// 結果: 600
```

行を分けると、計算の順番を自分で決められます。途中の結果に名前が付くので、読みやすくもなります。

説明とコード例は教材用に独自作成しています。課題の解答コードは載せていません。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)・[変数宣言](https://typescriptbook.jp/reference/values-types-variables/let-and-const)。

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
