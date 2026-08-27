# レッスン4-1 演習 — ifで分ける

対象トピック: 4-1-1 〜 4-1-4

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `stock.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const stock = 3;
    if (stock === 0) {
      console.log("入荷待ち");
    } else if (stock < 10) {
      console.log("残りわずか");
    } else {
      console.log("在庫あり");
    }
  </script>
</body>
```

2. `残りわずか` と出ることを確かめる

書けたら、次の改造を試してみましょう。

1. `stock` を `0`、`20` に変えて、3つの道をすべて通す
2. `const isPublished = false;` を足し、条件を `stock > 0 && isPublished` にしたifを書いて動きを確かめる
3. `const userName = "";` を宣言して `if (userName)` の分岐を書き、空文字がelse側に流れることを確かめる

## 演習問題

### 問1(基本)

会員ランクを表示する分岐を書いてください。`point` が100以上なら `ゴールド`、30以上なら `シルバー`、それ以外は `ブロンズ` と表示します。

### 問2(基本)

次の条件式が真になるstockとisOpenの組み合わせの例を1つ挙げてください。

```js
(stock > 0 && isOpen) || stock >= 100
```

### 問3(応用)

次のコードには順序の問題があります。scoreが95のときに何が表示されるかを答え、意図(90以上は「優秀」)どおりに直してください。

```js
if (score >= 60) {
  console.log("合格");
} else if (score >= 90) {
  console.log("優秀");
} else {
  console.log("不合格");
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
const point = 50;
if (point >= 100) {
  console.log("ゴールド");
} else if (point >= 30) {
  console.log("シルバー");
} else {
  console.log("ブロンズ");
}
```

厳しい条件(100以上)を上に書きます。

</details>

<details>
<summary>問2の解答例</summary>

例: `stock = 5, isOpen = true`(左側の&&が真)。または `stock = 100, isOpen = false`(右側が真)。||はどちらか一方が真なら全体が真です。

</details>

<details>
<summary>問3の解答例</summary>

`合格` と表示されます。95は最初の `score >= 60` でtrueになり、後の条件は見られません。直すには厳しい条件を上にします。

```js
if (score >= 90) {
  console.log("優秀");
} else if (score >= 60) {
  console.log("合格");
} else {
  console.log("不合格");
}
```

</details>

## 確認クイズ

### Q1. if文の{}の中が実行されるのはどんなときですか。

- A. ()の条件がtrueのとき
- B. ()の条件がfalseのとき
- C. 常に実行される

<details>
<summary>答え</summary>

**A** — 条件がtrueのときだけブロックの中が実行されます。

</details>

### Q2. else の説明として正しいものはどれですか。

- A. 条件を1つ追加した道を作る
- B. 上のどの条件にも当たらなかったときの道を作る
- C. プログラムを終了する

<details>
<summary>答え</summary>

**B** — elseは「残り全部」を受け持ちます。条件を足すのはelse ifです。

</details>

### Q3. a && b が真になるのはどんなときですか。

- A. aとbの両方が真のとき
- B. aとbのどちらかが真のとき
- C. aが偽のとき

<details>
<summary>答え</summary>

**A** — &&は「かつ」です。「または」は||を使います。

</details>

### Q4. if ("") { ... } のブロックは実行されますか。

- A. 実行される
- B. 実行されない
- C. 構文エラーになる

<details>
<summary>答え</summary>

**B** — 空文字はfalsyなので、条件としては偽の扱いです。

</details>

### Q5. 「10以上かつ20未満」の条件として正しいものはどれですか。

- A. n >= 10 && < 20
- B. n >= 10 && n < 20
- C. n >= 10 || n < 20

<details>
<summary>答え</summary>

**B** — &&の左右にはそれぞれ完結した条件式を書きます。||にすると全ての数で真になってしまいます。

</details>
