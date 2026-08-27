# レッスン1-2 演習 — 数値

対象トピック: 1-2-1 〜 1-2-4

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `numbers.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const price = 1980;
    const quantity = 3;
    let total = price * quantity;
    total += 500;
    console.log(total);
  </script>
</body>
```

2. コンソールに `6440` が出ることを確かめる(商品代 5940 + 送料 500)

書けたら、次の改造を試してみましょう。

1. `console.log(total >= 6000);` を足して、比較の結果が `true` で出ることを確かめる
2. `console.log(total % 1000);` を足して、余りがいくつになるか予想してから確かめる
3. `const input = "100";` を宣言し、`input + 1` と `Number(input) + 1` の結果を並べて表示して見比べる

## 演習問題

### 問1(基本)

次の式の結果をそれぞれ答えてください。

1. `10 % 3`
2. `"5" + 5`
3. `Number("5") + 5`

### 問2(基本)

次のコードを実行した後の `count` の値を答えてください。

```js
let count = 10;
count = count - 3;
count += 5;
```

### 問3(応用)

`stock !== 0` と `stock > 0` は、stockが正の整数のときはどちらもtrueになります。stockに `-2` が入っていたとき、それぞれの結果を答え、判定として安全なのはどちらか説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

1. `1` — 10を3で割った余り
2. `"55"` — 文字列との `+` はつなげる操作になる
3. `10` — Numberで数値に変換してから足しているので足し算になる

</details>

<details>
<summary>問2の解答例</summary>

`12` です。10 → (10-3で)7 → (+=5で)12 と、上から順に更新されます。

</details>

<details>
<summary>問3の解答例</summary>

`stock !== 0` は `true`(−2は0ではない)、`stock > 0` は `false` です。「在庫がある」の判定として安全なのは `stock > 0` です。想定外の値(負の数)でも意図どおりに判定できます。

</details>

## 確認クイズ

### Q1. 7 % 3 の結果はどれですか。

- A. 1
- B. 2
- C. 2.33

<details>
<summary>答え</summary>

**A** — %は割った余りです。7 ÷ 3 = 2 余り 1 なので1です。

</details>

### Q2. count = count + 1 の説明として正しいものはどれですか。

- A. countとcount + 1が等しいという意味
- B. 右側を計算した結果を、countに入れ直す
- C. 文法として誤りでエラーになる

<details>
<summary>答え</summary>

**B** — =は代入です。右が先、左が後の順で動きます。

</details>

### Q3. stock === 0 の結果の値の種類はどれですか。

- A. 数値
- B. 文字列
- C. 真偽値

<details>
<summary>答え</summary>

**C** — 比較演算子の結果は必ずtrueかfalse(真偽値)です。

</details>

### Q4. 等しさの比較にこの講座が使う演算子はどれですか。

- A. =
- B. ==
- C. ===

<details>
<summary>答え</summary>

**C** — =は代入、==は種類を勝手に変換して比べるため使いません。===に統一します。

</details>

### Q5. "100" + 1 の結果はどれですか。

- A. 101
- B. "1001"
- C. NaN

<details>
<summary>答え</summary>

**B** — 文字列との `+` はつなげる操作です。101にしたいならNumber("100") + 1と書きます。

</details>
