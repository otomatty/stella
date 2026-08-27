# レッスン6-2 演習 — 戻り値とコールバック

対象トピック: 6-2-1 〜 6-2-5

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `callbacks.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const taxIncluded = (price) => price * 1.1;
    const prices = [1000, 2000, 3000];
    const withTax = prices.map(taxIncluded);
    console.log(withTax);
  </script>
</body>
```

2. `[1100, 2200, 3300]` が出ることを確かめる

書けたら、次の改造を試してみましょう。

1. `prices.filter((p) => p >= 2000)` の結果も表示して、絞り込みを確かめる
2. filterの結果にmapをつなげて、「2000円以上だけ税込にした配列」を作る
3. `prices.map(taxIncluded())` とカッコを付けるとどうなるか、エラーメッセージを読んでみる(確かめたら戻す)

## 演習問題

### 問1(基本)

価格と数量を受け取り、合計金額を返す関数 `calcTotal(price, quantity)` をfunctionの形で書いてください。また、それを使って `calcTotal(1980, 3) + 500` を表示してください。

### 問2(基本)

次の関数を、空文字チェックの早期リターン付きに書き換えてください。空文字なら `"(未入力)"` を返します。

```js
function decorate(name) {
  return `【${name}】`;
}
```

### 問3(応用)

配列 `const scores = [85, 42, 90, 58, 71];` から、60以上の点数だけを「合格: 85点」の形の文字列にした配列を、filterとmapで作って表示してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
function calcTotal(price, quantity) {
  return price * quantity;
}
console.log(calcTotal(1980, 3) + 500);  // => 6440
```

戻り値なので、呼び出しの式をそのまま足し算に使えます。

</details>

<details>
<summary>問2の解答例</summary>

```js
function decorate(name) {
  if (name === "") {
    return "(未入力)";
  }
  return `【${name}】`;
}
```

最初のreturnで関数が終わるため、elseは不要です。

</details>

<details>
<summary>問3の解答例</summary>

```js
const scores = [85, 42, 90, 58, 71];
const passed = scores.filter((s) => s >= 60).map((s) => `合格: ${s}点`);
console.log(passed);  // => ["合格: 85点", "合格: 90点", "合格: 71点"]
```

絞り込み(filter)→変換(map)の順につなげます。

</details>

## 確認クイズ

### Q1. 関数の戻り値の説明として正しいものはどれですか。

- A. returnで返した値で、呼び出した場所の値になる
- B. console.logで表示した値のこと
- C. 関数の名前のこと

<details>
<summary>答え</summary>

**A** — 呼び出しの式が戻り値に置き換わるので、代入や計算に使えます。

</details>

### Q2. 関数の途中でreturnが実行されるとどうなりますか。

- A. その行から関数の先頭に戻る
- B. 関数はそこで終わり、後ろの行は実行されない
- C. 後ろの行も続けて実行される

<details>
<summary>答え</summary>

**B** — この性質を使った書き方が早期リターンです。

</details>

### Q3. コールバックの説明として正しいものはどれですか。

- A. 引数として渡され、あとで呼ばれる関数
- B. 名前を2つ持つ関数
- C. 一度しか呼び出せない関数

<details>
<summary>答え</summary>

**A** — 関数は値として渡せます。渡すときは()を付けません。

</details>

### Q4. (n) => n * 2 と同じ意味のものはどれですか。

- A. function (n) { return n * 2; }
- B. function (n) { n * 2; }
- C. function n() { return 2; }

<details>
<summary>答え</summary>

**A** — {}を省いたアロー関数は、その式の値をreturnする意味です。Bはreturnが無いので値を返しません。

</details>

### Q5. [1, 2, 3, 4].filter((n) => n % 2 === 0) の結果はどれですか。

- A. [2, 4]
- B. [1, 3]
- C. [true, false]

<details>
<summary>答え</summary>

**A** — filterはコールバックがtrueを返した要素だけを残します。偶数の2と4が残ります。

</details>
