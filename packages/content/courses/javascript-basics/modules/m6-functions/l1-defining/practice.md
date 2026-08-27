# レッスン6-1 演習 — 関数を定義する

対象トピック: 6-1-1 〜 6-1-3

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `functions.html` を作り、次を書いて保存する

```html
<body>
  <script>
    function greet(name) {
      console.log(`${name}さん、ようこそ`);
    }
    greet("佐藤");
    greet("鈴木");
  </script>
</body>
```

2. 2人分の挨拶が出ることを確かめる

書けたら、次の改造を試してみましょう。

1. 呼び出しを1行増やして、自分の名前で挨拶させる
2. `function showTotal(price, quantity)` を定義して、`showTotal(1980, 3)` で合計を表示する
3. showTotalの中に `const message = "計算しました";` を宣言し、関数の外から `console.log(message)` するとエラーになることを確かめる(確かめたら消す)
4. greetの定義だけ残して呼び出しを全部消し、何も表示されない(定義だけでは動かない)ことを確かめる

## 演習問題

### 問1(基本)

税込価格を表示する関数 `showTaxIncluded(price)` を書いてください。税率は10%(価格 × 1.1)とし、`税込: 2178円` の形式で表示します。

### 問2(基本)

次のコードの出力を答えてください。

```js
function repeat(word, times) {
  for (let i = 0; i < times; i += 1) {
    console.log(word);
  }
}
repeat("確認", 2);
```

### 問3(応用)

次のコードはエラーになります。どの行で・なぜエラーになるかを説明してください。

```js
function buildLabel() {
  const label = "重要";
}
buildLabel();
console.log(label);
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
function showTaxIncluded(price) {
  console.log(`税込: ${price * 1.1}円`);
}
showTaxIncluded(1980);  // => 税込: 2178円
```

</details>

<details>
<summary>問2の解答例</summary>

`確認` が2行出ます。仮引数はword = "確認"、times = 2と順番どおりに対応します。

</details>

<details>
<summary>問3の解答例</summary>

最後の `console.log(label)` の行で `ReferenceError: label is not defined` になります。labelは関数の中で宣言されたローカル変数で、スコープは関数の中だけだからです。

</details>

## 確認クイズ

### Q1. 関数を定義しただけで、呼び出しを書かなかった場合どうなりますか。

- A. 定義した場所で1回だけ実行される
- B. 実行されない
- C. 構文エラーになる

<details>
<summary>答え</summary>

**B** — 定義は手順書の登録です。名前()の呼び出しがあって初めて実行されます。

</details>

### Q2. greet("佐藤") の "佐藤" を何と呼びますか。

- A. 引数
- B. 戻り値
- C. 変数名

<details>
<summary>答え</summary>

**A** — 呼び出し時に渡す値が引数です。受け取る側の変数は仮引数といいます。

</details>

### Q3. 引数を複数渡すとき、値はどう対応しますか。

- A. 名前が同じもの同士が対応する
- B. 渡した順番と仮引数の順番が対応する
- C. 大きい値から順に対応する

<details>
<summary>答え</summary>

**B** — 1つ目の引数が1つ目の仮引数に入ります。順番の間違いはエラーにならないので注意が必要です。

</details>

### Q4. 関数の中でconst宣言した変数はどこで使えますか。

- A. プログラム全体
- B. その関数の中だけ
- C. 同じファイルの全関数

<details>
<summary>答え</summary>

**B** — 変数が見える範囲をスコープといい、関数の中で宣言した変数のスコープはその関数の中だけです。

</details>
