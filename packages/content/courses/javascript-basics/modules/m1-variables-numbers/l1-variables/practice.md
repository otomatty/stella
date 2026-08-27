# レッスン1-1 演習 — 変数

対象トピック: 1-1-1 〜 1-1-4

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `variables.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const price = 1980;
    const quantity = 3;
    console.log(price * quantity);
  </script>
</body>
```

2. ブラウザーで開き、コンソールに `5940` が出ることを確かめる

書けたら、次の改造を試してみましょう。

1. `quantity` を `5` に書き換えて保存・再読み込みし、結果が変わることを確かめる
2. `price = 1500;` という行を末尾に足して、constへの再代入がエラーになることを確かめる(確かめたら消す)
3. `const userName = "自分の名前";` を宣言して、`console.log(userName)` で表示する
4. `console.log(Price * quantity)` と大文字で打ち間違えて、どんなエラーが出るか読む(確かめたら戻す)

## 演習問題

### 問1(基本)

次の変数を宣言するとき、constとletのどちらが適切ですか。理由も一言で書いてください。

1. 消費税率(0.1)
2. 処理した件数(0から始めて増やしていく)

### 問2(基本)

次の変数名の問題点をそれぞれ指摘し、より良い名前を提案してください。

1. `const a = 1980;`(商品の価格)
2. `const total price = 5940;`(合計金額)

### 問3(応用)

次のコードの2行目はエラーになります。エラーの種類を予想し、理由を説明してください。

```js
const stock = 12;
stock = stock - 1;
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

1. const — 処理の途中で変わらない値だから
2. let — 進行中に再代入して増やしていく値だから

「まずconst、再代入が必要ならlet」の順で考えます。

</details>

<details>
<summary>問2の解答例</summary>

1. 中身が分からない。`price` など中身を表す英単語にする
2. 変数名に空白は使えない。`totalPrice` とcamelCaseでつなぐ

</details>

<details>
<summary>問3の解答例</summary>

constで宣言した変数への再代入なので、`TypeError` 系のエラーで止まります。在庫のように減らしていく値なら、最初から `let stock = 12;` と宣言します。

</details>

## 確認クイズ

### Q1. 変数の「宣言」とは何をすることですか。

- A. 変数を作ること
- B. 変数を画面に表示すること
- C. 変数を削除すること

<details>
<summary>答え</summary>

**A** — `const price = 1980;` のように変数を作ることが宣言です。

</details>

### Q2. この講座がすすめる宣言の使い分けはどれですか。

- A. 常にletを使う
- B. 基本はconstで、再代入するものだけlet
- C. 短い名前のときだけconst

<details>
<summary>答え</summary>

**B** — constは再代入をエラーにして、意図しない書き換えを防いでくれます。

</details>

### Q3. camelCaseの変数名として正しいものはどれですか。

- A. total_price
- B. TotalPrice
- C. totalPrice

<details>
<summary>答え</summary>

**C** — 先頭は小文字、2語目からの先頭を大文字にするのがcamelCaseです。

</details>

### Q4. "100" + "100" の結果はどれですか。

- A. 200
- B. 100100
- C. エラーになる

<details>
<summary>答え</summary>

**B** — 文字列の `+` はつなげる操作です。足し算になるのは数値どうしのときです。

</details>

### Q5. 真偽値の値の組み合わせとして正しいものはどれですか。

- A. yes と no
- B. true と false
- C. 1 と 0

<details>
<summary>答え</summary>

**B** — 真偽値はtrueとfalseの2つだけです。「あり/なし」のような2択の状態に使います。

</details>
