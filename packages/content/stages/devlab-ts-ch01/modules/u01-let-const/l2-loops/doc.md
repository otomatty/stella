---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-statements-for-of, SRC-typescriptbook-statements-if-else, SRC-typescriptbook-values-types-variables-string]
---

# レッスン1-1 くり返しで値を変える

## このレッスンの目標

- [ ] let の入れ直しと for の実行順を説明できる
- [ ] 数える向きと回数を変え、ゼロ回のときの動きを説明できる
- [ ] 文字を一つずつ取り出し、条件やつなぐ順番を読める

## 1-1-5 入れ直す変数とくり返し

> **入れ直す変数を let で作り、for でくり返すと、値を少しずつ変えられます。**

変数は、名前を付けた値の入れ物です。
後から値を入れ直すことを「再代入」と呼びます。
入れ直す変数だけ `let` にし、それ以外は `const` にします。

```ts
// 在庫 stock を入れ直せる変数として作り、10 を入れる
let stock = 10;
// stock に 5 を足した数を、stock に入れ直す
stock = stock + 5;
// 在庫を表示する
console.log(stock);
// 結果: 15
```

右側が先に計算され、今の 10 に 5 を足した 15 が入ります。
2 回目からは `let` を書きません。
同じ名前の変数を、もう一度作る操作ではありません。
`const stock = 10;` で作ってから入れ直すと、型のエラーになります。

`for` 文は、同じ処理をくり返す書き方です。
毎月の積立のように、同じ金額を何度も足す仕事に使えます。

```ts
// 積立額 saving を入れ直せる変数として作り、0 を入れる
let saving = 0;
// i を 1 から 3 まで 1 ずつ増やしながらくり返す
for (let i = 1; i <= 3; i++) {
  // saving に 5000 を足す
  saving += 5000;
  // くり返す中身はここまで
}
// 積立額を表示する
console.log(saving);
// 結果: 15000
```

かっこの中は `;` で三つに区切ります。
開始の `let i = 1` は、最初に一度だけ実行します。
条件の `i <= 3` は、中身の前に毎回確かめます。
中身を一回実行したあと、更新の `i++` を実行します。
その後は条件、中身、更新の順をくり返します。

`<=` は「以下」です。同じ値も含むので、`3 <= 3` も成り立ちます。
比較の結果は、成り立つと `true`、成り立たないと `false` です。
`i++` は `i = i + 1` と同じく、一増やします。
`+=` は足して入れ直す書き方です。
`saving += 5000` は `saving = saving + 5000` と同じです。

| 中身の前の i | i <= 3 | 中身のあとの saving |
| --- | --- | --- |
| 1 | true | 5000 |
| 2 | true | 10000 |
| 3 | true | 15000 |
| 4 | false | 中身を実行せず、15000 のまま |

`*=` は、掛けて入れ直す書き方です。

```ts
// 価格 price を入れ直せる変数として作り、1000 を入れる
let price = 1000;
// price に 2 を掛ける
price *= 2;
// price に 500 を足す
price += 500;
// 価格を表示する
console.log(price);
// 結果: 2500
```

`price *= 2` は `price = price * 2` と同じです。
よくある間違いは、入れ直す変数を `const` にすることです。
`++`・`+=`・`*=` も入れ直しなので `let` が必要です。
入れ直さない変数は `const` にし、最初から使う値を入れます。
この課題の lint は、不要な let や使われない最初の値も確かめます。

問5は 1 から n までを足します。
問6は 1 から順に掛けた「階乗」を返します。
`sumTo(10)` は `55`、`sumTo(1)` は `1`、`sumTo(0)` は `0` です。
`factorial(5)` は `120`、`factorial(1)` は `1`、`factorial(0)` も `1` です。
ゼロ回なら最初の値が残ることも確かめましょう。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)。説明・積立と価格の例は教材用に独自作成しています。

## 1-1-6 数え方を変える

> **for の開始値・条件・更新をそろえると、逆向きや指定回数のくり返しを書けます。**

`>=` は「以上」です。同じ値も含みます。
`i--` は `i = i - 1` と同じで、一減らします。
開始を大きい数にし、減らす更新と組み合わせます。
発送便の番号を、大きい側から並べる例です。

```ts
// 履歴 log を入れ直せる変数として作り、空の文字列を入れる
let log = "";
// i を 3 から 1 まで 1 ずつ減らしながらくり返す
for (let i = 3; i >= 1; i--) {
  // log の後ろに便の番号と空白をつなげる
  log += `${i}便 `;
  // くり返す中身はここまで
}
// 履歴を表示する
console.log(log);
// 結果: "3便 2便 1便 "（最後にも空白があります）
```

空の文字列 `""` は、文字が一つもない値です。
文字列の `+=` は、後ろにつなげて入れ直します。
`${i}便 ` はテンプレートリテラルです。
数字も文字として埋め込みます。
`i` は 3、2、1 の順で変わります。
その次は 0 となり、`0 >= 1` は `false` なので終わります。

ゼロから数えるときは、`<` を使います。
「未満」という意味で、同じ数を含みません。
0 から n の手前までなら、n 回になります。

```ts
// 回数 n を作り、3 を入れる
const n = 3;
// 印 stamps を入れ直せる変数として作り、空の文字列を入れる
let stamps = "";
// i を 0 から n の手前まで 1 ずつ増やしながらくり返す
for (let i = 0; i < n; i++) {
  // stamps の後ろに済をつなげる
  stamps += "済";
  // くり返す中身はここまで
}
// 印を表示する
console.log(stamps);
// 結果: "済済済"
```

| i | i < 3 | stamps |
| --- | --- | --- |
| 0 | true | "済" |
| 1 | true | "済済" |
| 2 | true | "済済済" |
| 3 | false | "済済済" のまま |

よくある間違いは、ゼロから始めて `i <= n` と書くことです。
0、1、2、3 の四回になり、一回多く実行します。
逆向きなら、減らす `--` と「以上」の条件を組み合わせます。
条件と更新の向きが合っているかを見ましょう。

```ts
// 回数 n を作り、0 を入れる
const n = 0;
// ポイント points を入れ直せる変数として作り、10 を入れる
let points = 10;
// i を 0 から n の手前まで 1 ずつ増やしながらくり返す
for (let i = 0; i < n; i++) {
  // points に 2 を掛ける
  points *= 2;
  // くり返す中身はここまで
}
// ポイントを表示する
console.log(points);
// 結果: 10
```

条件は、中身より先に確かめます。
`0 < 0` は `false` なので、掛け算は一回も行いません。
最初の 10 がそのまま残ります。
引数を変えたいときも、let の別の変数に写します。
課題では引数そのものへの入れ直しは認めていません。

問7では、数の間をコンマと空白で区切ります。
`countDown(3)` は `"3, 2, 1, 発射"`、`countDown(1)` は `"1, 発射"` です。
`countDown(0)` は、数のない `"発射"` です。
問8では同じ数を指定回数掛けます。
`power(2, 10)` は `1024`、`power(5, 0)` は `1`、`power(3, 3)` は `27` です。
`**` や `Math.pow` を使わず、for で書く問題です。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)。説明・便の履歴と印の例は教材用に独自作成しています。

## 1-1-7 1 文字ずつ見る

> **for-of で文字を取り出し、条件を調べたり、つなぐ順を変えたりできます。**

`for-of` は、一つずつ取り出してくり返す書き方です。
文字列では、先頭から一文字ずつ取り出せます。
注文番号に区切りを付ける例です。

```ts
// 注文番号 text を作り、AB を入れる
const text = "AB";
// 表示 spaced を入れ直せる変数として作り、空の文字列を入れる
let spaced = "";
// text から 1 文字ずつ c に取り出してくり返す
for (const c of text) {
  // spaced の後ろに c と空白をつなげる
  spaced += `${c} `;
  // くり返す中身はここまで
}
// 表示を確かめる
console.log(spaced);
// 結果: "A B "（最後にも空白があります）
```

`c` は `"A"`、`"B"` の順で取り出されます。
一周ごとに新しい c を作るので、`const c` で書けます。
同じ c に入れ直しているわけではありません。
文字がなくなると終わり、空の文字列なら一度も実行しません。
ここでは、英字や「あいう」のような文字を扱います。

`if` は、条件に合うときだけ処理する書き方です。
`===` は、等しいかを比べます。
条件が `true` なら中身を実行し、`false` なら飛ばします。

```ts
// 数値の stock を受け取り、在庫の表示を返す関数を作る
export function stockLabel(stock: number): string {
  // 表示 label を入れ直せる変数として作り、在庫ありを入れる
  let label = "在庫あり";
  // もし stock が 0 と等しいなら
  if (stock === 0) {
    // label に売り切れを入れ直す
    label = "売り切れ";
    // 条件に合うときの中身はここまで
  }
  // label を返す
  return label;
  // 関数の中身はここまで
}
// 在庫が 0 と 5 の表示を確かめる
console.log(stockLabel(0), stockLabel(5));
// 結果: 売り切れ 在庫あり
```

よくある間違いは、比較に `=` を一つ書くことです。
一つの `=` は右の値を左に入れる印です。
比較は `===` と三つ書きます。`==` は課題の lint でエラーになります。
for も if も、中身が一行でも `{ }` を付けます。

`.includes()` は、文字列に含まれるかを調べます。
値の後ろに `.` を付けて呼ぶ関数を「メソッド」と呼びます。

```ts
// メールアドレス email を作る
const email = "sato@example.com";
// hasAt を作り、アットマークを含むかを入れる
const hasAt = email.includes("@");
// hasSpace を作り、空白を含むかを入れる
const hasSpace = email.includes(" ");
// 二つの結果を表示する
console.log(hasAt, hasSpace);
// 結果: true false
```

`includes` の前が調べられる文字列で、かっこの中が探す文字列です。
結果は `true` か `false` なので、if の条件にも使えます。

文字列の `+` は、文字を左から順につなげます。
これを「文字列の連結」と呼びます。
前に足したい文字を左に置き、出来上がった値を入れ直します。

```ts
// 商品名 item を作り、ノートを入れる
const item = "ノート";
// 接頭辞 prefix を作り、新を入れる
const prefix = "新";
// 表示 label を入れ直せる変数として作り、item を入れる
let label = item;
// prefix の後ろに label をつなげ、label に入れ直す
label = prefix + label;
// 表示を確かめる
console.log(label);
// 結果: 新ノート
```

右側は、入れ直す前の label を使って計算します。
順番を逆にすると `"ノート新"` になります。
この課題では、文字列の変数同士の `+` は使えます。
文字列そのものを `+` でつなぐと lint のエラーになります。
その場合はテンプレートリテラルにします。

問9では、取り出した文字が引数 char と等しいかを調べます。
`countChar("banana", "a")` は `3`、`countChar("banana", "z")` は `0` です。
`countChar("", "a")` も `0` です。
問10では、取り出した文字を前に足す順番を考えます。
`reverseText("abc")` は `"cba"`、`reverseText("あいう")` は `"ういあ"` です。
`reverseText("")` は `""` です。
問16の母音は `a`、`e`、`i`、`o`、`u` の五つの英字です。
`countVowels("education")` は `5`、`countVowels("rhythm")` は `0` です。
`countVowels("")` も `0` です。
関数の形とテストの値を読み、中身は自分で書きましょう。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)・[if-else文](https://typescriptbook.jp/reference/statements/if-else)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)。説明・注文番号と在庫の例は教材用に独自作成しています。

## もっと知りたい人へ

- サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)
- サバイバルTypeScript [for-of文](https://typescriptbook.jp/reference/statements/for-of)
- サバイバルTypeScript [if-else文](https://typescriptbook.jp/reference/statements/if-else)
- サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)
