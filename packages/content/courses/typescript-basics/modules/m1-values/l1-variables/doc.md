# レッスン1-1 変数

## このレッスンの目標

- [ ] 変数の宣言・代入・参照が何を指すか説明できる
- [ ] `const`と`let`を使い分けられる
- [ ] `var`を見かけても手が止まらない

## 1-1-1 変数とは

> **変数は、値に名前を付けて後から呼び出す仕組み**

プログラムは「値を保存して、加工する」ことの繰り返しです。保存しておく場所がなければ、計算した結果を次の行で使えません。その置き場所が変数です。

変数まわりには3つの用語があります。

- **宣言** — 名前を用意すること
- **代入** — 名前に値を入れること
- **参照** — 名前で値を取り出すこと

```ts
let userName = "田中";
console.log(userName); // => "田中"
```

1行目で`userName`という名前を用意して値を入れ(宣言と代入)、2行目で名前を書くだけで値を取り出しています(参照)。

![変数のイメージ図。値に名前を付けて箱にしまい、名前を呼んで取り出す](t1-what-is-a-variable/assets/variable-box.svg)

## 1-1-2 constとletの違い

> **constは再代入できない、letはできる**

**再代入**とは、すでにある変数に別の値を入れ直すことです。宣言と同時に行う1回目の代入ではなく、2回目以降の代入を指します。

```ts
let stockCount = 10;
stockCount = 8; // 再代入OK
console.log(stockCount); // => 8

const taxRate = 0.1;
taxRate = 0.08;
// エラー: Cannot assign to 'taxRate' because it is a constant.
```

在庫数のように変わっていく値は`let`、税率のように変わってほしくない値は`const`です。2回目の代入では`let`を書かない点に注意してください。

エラーメッセージは「`taxRate`は定数(constant)なので代入できません」という意味です。

![letとconstの対比図。letは新しい値を受け入れ、constは弾く](t2-const-and-let/assets/let-vs-const.svg)

## 1-1-3 なぜ既定をconstにするのか

> **まずconstで書き、再代入が必要になったときだけletに変える**

技術的にはどちらでも動く場面が多いため、基準がないと毎回迷います。実務では「まず`const`」が広く使われています。

`const`は制約であると同時に、読む人への情報でもあります。`const`と書いてあれば「この値は最後まで変わらない」と分かり、再代入を探さずに済みます。逆に`let`が出てきたら「ここは変わる」と身構えられます。

```ts
const companyName = "株式会社サンプル"; // 変わらない
const salesTarget = 500000; // 変わらない

let currentSales = 120000; // 日々更新される
currentSales = 135000;
```

迷ったときの手順は次の3つです。

1. とりあえず`const`で書く
2. 再代入したくなってエラーが出たら`let`に変える
3. その前に「本当に再代入が必要か」を一度だけ疑う

別の名前の変数を新しく作ったほうが読みやすいことも多くあります。

## 1-1-4 varを使わない理由

> **varは読めればよい。新しいコードではconstとletだけを使う**

`var`は昔の宣言キーワードです。古い記事やAIの出力に混ざっていることがあるので、扱い方だけ決めておきます。

`var`が「悪い」のではなく、後から出た`const`と`let`のほうが安全に作られている、という順序で理解してください。たとえば`var`は、同じ名前で二度宣言してもエラーになりません。

```ts
var price = 300;
var price = 500; // 二度宣言してもエラーにならない

let stock = 10;
let stock = 20;
// エラー: Cannot redeclare block-scoped variable 'stock'.
```

長いファイルで同名の変数を作ってしまい、前の値が消える事故につながります。`let`なら実行前にエラーで止めてくれます。

## もっと知りたい人へ

- [変数宣言: letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const) — letとconstの違いと使い分け
- [varはもう使わない](https://typescriptbook.jp/reference/values-types-variables/vars-problems) — varの問題点(再宣言・巻き上げなど)

---

演習は [practice.md](practice.md) にあります。
