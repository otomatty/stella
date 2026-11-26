---
sourceRefs: [SRC-typescriptbook-values-types-variables-any]
---

# レッスン8-1 q08 any をなくす

## このレッスンの目標

- [ ] any を具体的な型に直し、見つかった名前の間違いを修正できる
- [ ] 数字の文字列を数値に変えて計算できる
- [ ] 数値の配列の型を書き、件数と合計を区別できる

動画を見たら、このまとめで書き方を振り返ります。この単元の「01章 q08 any をなくす」を VS Code で開き、解放された問題を一問ずつ確認して提出します。

## 8-1-1 any を具体的な型に直す

> **any を具体的な型に直すと、名前の間違いを型の確認で見つけられます。**

any はどんな値でも受け付ける型です。使うメソッドの名前が間違っていても、型の確認を通ってしまいます。たとえば送料の表示で、次の名前にはつづりの間違いがあります。

```ts
// 送料を表示する文字列にする
function shippingLabel(fee: any): any {
  // 小数点以下をなくして表示するつもりの行
  return fee.toFixd(0);
}
console.log(shippingLabel(650)); // エラー: fee.toFixd is not a function
```

数値を渡して実行すると、存在しないメソッドを呼び出して止まります。引数を `number`、戻り値を `string` に直すと、実行する前に `toFixd` のエラーが出ます。正しい名前の `toFixed` に直します。

```ts
// 送料を表示する文字列にする
function shippingLabel(fee: number): string {
  // 小数点以下をなくして表示する
  return fee.toFixed(0);
}
console.log(shippingLabel(650)); // => "650"
```

受け取る値と返す値は、別々に型を決めます。数値は `number`、文字列は `string`、真偽値は `boolean` です。型の確認が通っても、計算の内容まで正しいとは限りません。期待する結果になるかも確かめます。

点の右側に書く名前をプロパティと呼びます。文字列の `length` は読むだけなので、値を入れられません。

```ts
// 荷物の区画名は文字列
const zoneName: string = "南倉庫";
// 間違い: 文字数に値を入れようとしている
// zoneName.length = 3; // エラー: length は読み取り専用
// 文字数が3かどうかを比べる
const isThree = zoneName.length === 3;
console.log(isThree); // => true
```

`zoneName.length = 3` は型のエラーになります。`=` は値を入れる記号で、等しいかを比べる記号は `===` です。この課題では、any を一つでも残すと書き方の確認でエラーになります。型と、型を付けて見つかった間違いを直しましょう。

## 8-1-2 文字列を数値に変える

> **Number(文字列) で、数字の文字列を数値に変えられます。**

入力欄などから届く数字は、文字列のことがあります。整理券の印字を文字列で読み取ったら、計算の前に `Number` に渡します。

```ts
// 整理券の印字を文字列で受け取る
const ticketText = "42";
// 数値に変えてから、次の番号を求める
const next = Number(ticketText) + 1;
console.log(next); // => 43
```

`Number` は先頭が大文字です。かっこの中に変えたい文字列を書きます。文字列のまま足す場合とは、結果も型も違います。

| 式 | 結果 | 型 |
| --- | --- | --- |
| `"42" + 1` | `"421"` | string |
| `Number("42") + 1` | `43` | number |

## 8-1-3 数値を並べた配列の型

> **数値を並べた配列の型は、number[] と書きます。**

配列は、値を順番に並べたものです。数値を並べた配列の型は、`number` に角かっこを付けて `number[]` と書きます。角かっこが、値が並んでいることを表す印です。

```ts
// 歩数の記録が何日ぶんあるか返す
function countDays(steps: number[]): number {
  // 並んでいる値の数を返す
  return steps.length;
}
console.log(countDays([3200, 5100, 4800])); // => 3
```

`steps` には並び全体を渡します。配列の `length` が表すのは、並んでいる値の数です。この例では合計の `13100` ではなく、件数の `3` が返ります。空の配列 `[]` の件数は `0` です。

合計が必要なら、`for-of` で先頭から一つずつ取り出して足します。

```ts
// 歩数の記録を順に並べる
const steps: number[] = [3200, 5100, 4800];
// 合計を入れる変数を用意する
let total = 0;
// 記録を先頭から一つずつ読む
for (const step of steps) {
  // その日の歩数を合計に足す
  total += step;
}
console.log(total); // => 13100
```

`number[]` を付けると、並んだ値が数値かどうかや、使うプロパティの名前を確かめられます。

## もっと知りたい人へ

- [サバイバルTypeScriptの any](https://typescriptbook.jp/reference/values-types-variables/any)で、型の確認がどう変わるかを確認できます。説明・例・知識問題は教材用に作成しています。

## 問題ごとのヒント

### 問1 2 つの数を足す

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

### 問2 「こんにちは、◯◯さん」を返す

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

### 問3 文字数を返す

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

### 問4 20 歳以上なら true を返す

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

### 問5 英字を大文字にする

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

### 問6 半分にした数を返す

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

### 問7 前後の空白を取り除く

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

### 問8 長方形の面積を返す

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

### 問9 金額をカンマ区切りにして「円」を付ける

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

### 問10 空の文字列なら true を返す

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

### 問11 最初の 1 文字を返す

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

### 問12 3 つの数を足す

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

### 問13 text を times 回つなげる

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

### 問14 2 つの数のうち大きい方を返す

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

### 問15 text に word が含まれていれば true を返す

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

### 問16 文字列を数値に変える

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

### 問17 件数の後ろに「件」を付ける

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

### 問18 小数点以下を四捨五入する

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

### 問19 2 人の名前を「・」でつなぐ

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

### 問20 最後の 1 文字を返す

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

