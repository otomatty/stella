---
sourceRefs: [SRC-typescriptbook-values-types-variables-any]
---
# レッスン1-8 q08 any をなくす

## このレッスンの目標

- [ ] 受け取る値と返す値に合う型を選べる
- [ ] よくある間違いを説明できる
- [ ] ヒントを読んで、一問ずつ確認して提出できる

実装は「01章の問題」の q08 のファイルで行います。
知識問題は理解の自己確認です。選考の判定には使いません。

## 1-8-1 any をなくす

> **any を具体的な型に直すと、値の使い方の間違いを見つけられます。**

`any` は、どんな値でもよいという型です。
型の確認が操作の間違いを教えなくなるため、バグを見落とします。
引数は「何を受け取るか」、戻り値は「何を返すか」で型を決めます。
数値は `number`、文字列は `string`、真偽値は `boolean` です。

```ts
// 関数 feeLabel を作る。数値の fee を受け取り、文字列を返す
function feeLabel(fee: number): string {
  // fee を小数点以下 0 桁の文字列にして返す
  return fee.toFixed(0);
}
// feeLabel に 500 を渡した結果を表示する
console.log(feeLabel(500));
// 結果: "500"
```

よくある間違いは、`toFixed` を `toFixd` と書くことです。
`fee: any` では型の確認を通りますが、実行すると止まります。
`fee: number` に変えると、間違った名前にエラーが出ます。
この課題では `any` を一つでも残すと lint のエラーになります。
型だけでなく、見つかった名前の間違いも直してください。

点の右の名前をプロパティと呼びます。
`値.名前 = 新しい値` は、プロパティに値を入れる書き方です。
ただし、文字列の `length` は読むだけのプロパティです。
`code.length = 5` のように値を入れることはできません。

```ts
// 商品コード code を作り、"P-8" を入れる
const code = "P-8";
// 文字数 count を作り、code の length を読んだ値を入れる
const count = code.length;
// count を表示する
console.log(count);
// 結果: 3
```

`Number()` は、値を数値に変える書き方です。
`String()` と変換の向きが反対です。

```ts
// 入力 input を作り、"120" を入れる
const input = "120";
// 個数 quantity を作り、input を数値にしたものを入れる
const quantity = Number(input);
// quantity を表示する
console.log(quantity);
// 結果: 数値の 120
```

`Number("3.5")` は数値の `3.5` です。
`Number("abc")` は、数ではないことを表す値 `NaN` になります。
文字列の `"120"` と数値の `120` を混同しないようにします。

配列は、値を順番に並べたものです。
数値を並べた `[300, 500, 200]` の型は `number[]` と書けます。
要素とは、配列の中に並んだ一つ一つの値です。
配列の `.length` は要素の数です。空の配列 `[]` なら 0 です。

```ts
// 関数 countPrices を作る。数値の配列 prices を受け取り、数値を返す
function countPrices(prices: number[]): number {
  // prices の要素の数を返す
  return prices.length;
}
// 三つの価格と空の配列の件数を表示する
console.log(countPrices([300, 500, 200]), countPrices([]));
// 結果: 3 0
```

よくある間違いは、`.length` を価格の合計だと考えることです。
この例は合計の 1000 ではなく、件数の 3 を返します。
`for-of` で、文字列と同じように先頭から一つずつ取り出せます。

```ts
// 関数 hasExpensive を作る。数値の配列 prices を受け取り、真偽を返す
function hasExpensive(prices: number[]): boolean {
  // 見つかったか found を入れ直せる変数として作り、false を入れる
  let found = false;
  // prices から一つずつ price に取り出してくり返す
  for (const price of prices) {
    // もし price が 1000 以上なら
    if (price >= 1000) {
      // found に true を入れ直す
      found = true;
    }
  }
  // found を返す
  return found;
}
// hasExpensive に二つの価格を渡した結果を表示する
console.log(hasExpensive([300, 1500]));
// 結果: true
```

配列の詳しい操作は、このあと学びます。
ここでは型、件数、繰り返しの形が読めれば十分です。

参考: サバイバルTypeScript [any](https://typescriptbook.jp/reference/values-types-variables/any)。説明・業務例・知識問題は教材用に構成しています。

## 問題ごとのヒント

### 問 1 2 つの数を足す

**テストで確かめる値**

- `add(2, 3)` は `5`

**ヒント 1 日本語の手順**

```ts
// 引数 a と b の型を number にする
// 戻り値の型を number にする
export function add(a: any, b: any): any {
  return a + b;
}
```

**ヒント 2 コードへの直し方**

`a: any` の `any` を消して、`number` と書きます。戻り値の型は、かっこの後ろの `: any` です。足し算の結果は数なので、ここも `number` です。

### 問 2 「こんにちは、◯◯さん」を返す

**テストで確かめる値**

- `greet("山田")` は `"こんにちは、山田さん"`

**ヒント 1 日本語の手順**

```ts
// 引数 name の型を string にする
// 戻り値の型を string にする
export function greet(name: any): any {
  // "こんにちは、" と name と "さん" を + でつないでいるのを、name を埋め込んだテンプレートリテラルに書き換える
  return "こんにちは、" + name + "さん";
}
```

**ヒント 2 コードへの直し方**

テンプレートリテラルは `` ` `` で全体を囲み、`name` を埋め込む所に `${name}` と書きます。01章 q01 の問3 のサンプル（`message`）と同じ形です。

### 問 3 文字数を返す

**テストで確かめる値**

- `lengthOf("abc")` は `3`

**ヒント 1 日本語の手順**

```ts
// 引数 text の型を string にする
// 戻り値の型を number にする
export function lengthOf(text: any): any {
  return text.length;
}
```

**ヒント 2 コードへの直し方**

受け取るのは文字列なので `string`、返すのは文字数なので `number` です。引数と戻り値で型が違います。

### 問 4 20 歳以上なら true を返す

**テストで確かめる値**

- `isAdult(20)` は `true`。ちょうど 20 歳
- `isAdult(19)` は `false`

**ヒント 1 日本語の手順**

```ts
// 引数 age の型を number にする
// 戻り値の型を boolean にする
export function isAdult(age: any): any {
  return age >= 20;
}
```

**ヒント 2 コードへの直し方**

`age >= 20` のように比べた結果は、`true` か `false` です。この型は `boolean` です。

### 問 5 英字を大文字にする

**テストで確かめる値**

- `shout("abc")` は `"ABC"`

**ヒント 1 日本語の手順**

```ts
// 引数 text の型を string にする
// 戻り値の型を string にする
export function shout(text: any): any {
  // 型を直すと、この行がエラーになる。エラーのメッセージを読んで直す
  return text.toUppercase();
}
```

**ヒント 2 コードへの直し方**

メソッドの名前のつづりが違います。大文字にするメソッドは、01章 q02 の問18 で使った `toUpperCase` です。エラーの `Did you mean …?` に、正しい名前の候補が出ています。

### 問 6 半分にした数を返す

**テストで確かめる値**

- `half(9)` は `4.5`。小数になる

**ヒント 1 日本語の手順**

```ts
// 引数 n の型を number にする
// 戻り値の型を number にする
export function half(n: any): any {
  return n / 2;
}
```

**ヒント 2 コードへの直し方**

`number` は整数と小数を区別しません。`4.5` も `number` です。

### 問 7 前後の空白を取り除く

**テストで確かめる値**

- `tidy("  hi  ")` は `"hi"`

**ヒント 1 日本語の手順**

```ts
// 引数 text の型を string にする
// 戻り値の型を string にする
export function tidy(text: any): any {
  // 型を直すと、この行がエラーになる。エラーのメッセージを読んで直す
  return text.trimm();
}
```

**ヒント 2 コードへの直し方**

メソッドの名前のつづりが違います。前後の空白を取り除くメソッドは、01章 q05 の問9 で使った `trim` です。

### 問 8 長方形の面積を返す

**テストで確かめる値**

- `area(3, 4)` は `12`

**ヒント 1 日本語の手順**

```ts
// 引数 width と height の型を number にする
// 戻り値の型を number にする
export function area(width: any, height: any): any {
  return width * height;
}
```

**ヒント 2 コードへの直し方**

引数が 2 つあるときは、どちらにも `: 型` を書きます。

### 問 9 金額をカンマ区切りにして「円」を付ける

**テストで確かめる値**

- `priceText(1200)` は `"1,200円"`

**ヒント 1 日本語の手順**

```ts
// 引数 price の型を number にする
// 戻り値の型を string にする
export function priceText(price: any): any {
  // 型を直すと、この行がエラーになる。エラーのメッセージを読んで直す
  // + でつないでいるのを、テンプレートリテラルに書き換える
  return price.toLocalString("ja-JP") + "円";
}
```

**ヒント 2 コードへの直し方**

メソッドの名前のつづりが違います。カンマ区切りにするメソッドは、01章 q02 の問12 で使った `toLocaleString` です（Local の後ろに e があります）。直したメソッドの呼び出しを `${ }` の中に書き、後ろに「円」を付けます。

### 問 10 空の文字列なら true を返す

**テストで確かめる値**

- `isEmpty("")` は `true`
- `isEmpty("a")` は `false`

**ヒント 1 日本語の手順**

```ts
// 引数 text の型を string にする
// 戻り値の型を boolean にする
export function isEmpty(text: any): any {
  // 型を直すと、この行がエラーになる。エラーのメッセージを読んで直す
  return (text.length = 0);
}
```

**ヒント 2 コードへの直し方**

`=` は「入れる」です。ここでしたいのは、文字数が 0 と等しいかを「比べる」ことです。比べる書き方は 01章 q01 の問9 で出ました。比べた結果は `true` か `false` なので、戻り値の型とも合います。

### 問 11 最初の 1 文字を返す

**テストで確かめる値**

- `firstChar("abc")` は `"a"`

**ヒント 1 日本語の手順**

```ts
// 引数 text の型を string にする
// 戻り値の型を string にする
export function firstChar(text: any): any {
  return text.charAt(0);
}
```

**ヒント 2 コードへの直し方**

TypeScript には 1 文字だけを表す型はありません。1 文字も文字列なので `string` です。

### 問 12 3 つの数を足す

**テストで確かめる値**

- `sum3(1, 2, 3)` は `6`

**ヒント 1 日本語の手順**

```ts
// 引数 a と b と c の型を number にする
// 戻り値の型を number にする
export function sum3(a: any, b: any, c: any): any {
  return a + b + c;
}
```

**ヒント 2 コードへの直し方**

3 つの引数のどれにも、`: 型` を書きます。1 つでも `any` が残ると、lint でエラーになります。

### 問 13 text を times 回つなげる

**テストで確かめる値**

- `repeat("ha", 3)` は `"hahaha"`

**ヒント 1 日本語の手順**

```ts
// 引数 text の型を string にする
// 引数 times の型を number にする
// 戻り値の型を string にする
export function repeat(text: any, times: any): any {
  return text.repeat(times);
}
```

**ヒント 2 コードへの直し方**

2 つの引数で型が違います。くり返す文字列の `text` は `string`、回数の `times` は `number` です。

### 問 14 2 つの数のうち大きい方を返す

**テストで確かめる値**

- `larger(3, 7)` は `7`

**ヒント 1 日本語の手順**

```ts
// 引数 a と b の型を number にする
// 戻り値の型を number にする
export function larger(a: any, b: any): any {
  return Math.max(a, b);
}
```

**ヒント 2 コードへの直し方**

`Math.max()` は、渡した数のうち一番大きい数を返します（01章 q04 の問9）。返すのも数なので `number` です。

### 問 15 text に word が含まれていれば true を返す

**テストで確かめる値**

- `contains("TypeScript", "Script")` は `true`
- `contains("TypeScript", "Java")` は `false`

**ヒント 1 日本語の手順**

```ts
// 引数 text と word の型を string にする
// 戻り値の型を boolean にする
export function contains(text: any, word: any): any {
  // 型を直すと、この行がエラーになる。エラーのメッセージを読んで直す
  return text.contain(word);
}
```

**ヒント 2 コードへの直し方**

メソッドの名前が違います。含まれているかを調べるメソッドは、01章 q01 の問16 で使った `includes` です。このエラーには候補が出ないので、名前を思い出して直します。

### 問 16 文字列を数値に変える

**テストで確かめる値**

- `toNumber("42")` は `42`。文字列ではなく数値

**ヒント 1 日本語の手順**

```ts
// 引数 text の型を string にする
// 戻り値の型を number にする
export function toNumber(text: any): any {
  return Number(text);
}
```

**ヒント 2 コードへの直し方**

受け取るのは `"42"` のような文字列、返すのは `42` のような数値です。引数と戻り値で型が違います。

### 問 17 件数の後ろに「件」を付ける

**テストで確かめる値**

- `countLabel(3)` は `"3件"`

**ヒント 1 日本語の手順**

```ts
// 引数 count の型を number にする
// 戻り値の型を string にする
export function countLabel(count: any): any {
  // + でつないでいるのを、count を埋め込んだテンプレートリテラルに書き換える
  return count + "件";
}
```

**ヒント 2 コードへの直し方**

受け取るのは数値、返すのは文字列です。テンプレートリテラルに数値を埋め込むと、文字に変わります。

### 問 18 小数点以下を四捨五入する

**テストで確かめる値**

- `roundOff(2.6)` は `3`

**ヒント 1 日本語の手順**

```ts
// 引数 n の型を number にする
// 戻り値の型を number にする
export function roundOff(n: any): any {
  return Math.round(n);
}
```

**ヒント 2 コードへの直し方**

`Math.round()` は四捨五入した数を返します（01章 q01 の問13）。返すのも数です。

### 問 19 2 人の名前を「・」でつなぐ

**テストで確かめる値**

- `joinNames("山田", "佐藤")` は `"山田・佐藤"`

**ヒント 1 日本語の手順**

```ts
// 引数 a と b の型を string にする
// 戻り値の型を string にする
export function joinNames(a: any, b: any): any {
  // + でつないでいるのを、a と b を埋め込んだテンプレートリテラルに書き換える
  return a + "・" + b;
}
```

**ヒント 2 コードへの直し方**

`${ }` は 1 つの文字列の中に何回でも書けます。`a` と `b` の間に、「・」をそのまま書きます。

### 問 20 最後の 1 文字を返す

**テストで確かめる値**

- `lastChar("abc")` は `"c"`

**ヒント 1 日本語の手順**

```ts
// 引数 text の型を string にする
// 戻り値の型を string にする
export function lastChar(text: any): any {
  return text.slice(-1);
}
```

**ヒント 2 コードへの直し方**

`slice(-1)` は、後ろから 1 文字を取り出した文字列を返します。1 文字も文字列なので `string` です。

### 応用（総合） テストの点数を集計する（any をなくす）

**テストで確かめる値**

- `average([80, 90, 70])` は `80`
- `average([55, 60])` は `57.5`
- `average([])` は Error を投げる。空の配列
- `toGrade(80)` は `"A"`。80 以上
- `toGrade(79)` は `"B"`
- `toGrade(60)` は `"B"`。60 以上
- `toGrade(59)` は `"C"`
- `report("田中", [80, 90, 70])` は `"田中さんの平均点は80.0点（A）"`。平均点は小数第 1 位まで
- `report("佐藤", [55, 60])` は `"佐藤さんの平均点は57.5点（C）"`

**ヒント 1 日本語の手順**

```ts
// 引数 scores の型を number[] にする
// 戻り値の型を number にする
export function average(scores: any): any {
  // もし scores の要素の数が 0 と等しいなら
  //   Error を投げる
  let sum = 0;
  for (const score of scores) {
    sum += score;
  }
  // 型を直すと、この行がエラーになる。エラーのメッセージを読んで直す
  return sum / scores.lenght;
}

// 引数 score の型を number にする
// 戻り値の型を string にする
export function toGrade(score: any): any {
  if (score >= 80) {
    return "A";
  }
  if (score >= 60) {
    return "B";
  }
  return "C";
}

// 引数 name の型を string に、scores の型を number[] にする
// 戻り値の型を string にする
export function report(name: any, scores: any): any {
  const avg = average(scores);
  // 型を直すと、この行がエラーになる。エラーのメッセージを読んで直す
  // + でつないでいるのを、name、avg を小数第 1 位までにした文字列、toGrade(avg) を埋め込んだテンプレートリテラルに書き換える
  return name + "さんの平均点は" + avg.toFixd(1) + "点（" + toGrade(avg) + "）";
}
```

**ヒント 2 コードへの直し方**

バグは 2 つとも、名前のつづりの間違いです。`scores.lenght` は配列の要素の数の `length`、`avg.toFixd(1)` は 01章 q03 で使った `toFixed` です。空の配列のチェックは、合計を求める前に書きます。要素の数が 0 かを `if` で比べ、`throw new Error("…")` で Error を投げます（01章 q04 の問8）。

