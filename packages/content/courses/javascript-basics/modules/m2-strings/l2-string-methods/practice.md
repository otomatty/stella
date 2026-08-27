# レッスン2-2 演習 — 文字列を操作する

対象トピック: 2-2-1 〜 2-2-5

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `methods.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const subject = "【緊急】サーバー障害の報告";
    console.log(subject.length);
    console.log(subject.includes("緊急"));
    console.log(subject.replace("【緊急】", "【対応済】"));
  </script>
</body>
```

2. コンソールに `13`・`true`・`【対応済】サーバー障害の報告` が出ることを確かめる

書けたら、次の改造を試してみましょう。

1. `subject.slice(0, 4)` を表示して、`【緊急】` が取れることをインデックスを数えて確かめる
2. `"  OK  ".trim().toLowerCase()` を表示して、掃除→そろえるの流れを確かめる
3. `"2026/08/26".replaceAll("/", "-")` と `replace` の結果を並べて表示し、違いを確かめる

## 演習問題

### 問1(基本)

変数 `email` に `"Sato@Example.com"` が入っています。次をコードで書いてください。

1. `@` が含まれているかを表示する
2. すべて小文字にした結果を表示する

### 問2(基本)

`"EMP-2026-001"` から `"001"` を切り出すsliceの呼び出しを書いてください(インデックスを数えて指定すること)。

### 問3(応用)

次のコードの結果を予想し、意図(すべての空白を`_`にする)どおりに直してください。

```js
const title = "月次 報告 資料";
console.log(title.replace(" ", "_"));
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
const email = "Sato@Example.com";
console.log(email.includes("@"));      // => true
console.log(email.toLowerCase());      // => "sato@example.com"
```

</details>

<details>
<summary>問2の解答例</summary>

```js
console.log("EMP-2026-001".slice(9, 12));  // => "001"
```

インデックスは0始まりで、`0` は9番目です。終了は含まないので12を指定します。`slice(9)` と終了を省いても同じ結果になります。

</details>

<details>
<summary>問3の解答例</summary>

結果は `月次_報告 資料` です。replaceは最初の1つしか置き換えません。すべて置き換えるにはreplaceAllを使います。

```js
console.log(title.replaceAll(" ", "_"));  // => "月次_報告_資料"
```

</details>

## 確認クイズ

### Q1. "こんにちは".length の結果はどれですか。

- A. 5
- B. 6
- C. "こんにちは"

<details>
<summary>答え</summary>

**A** — lengthは文字数を返します。カッコを付けずに使う点も特徴です。

</details>

### Q2. includesの結果の値の種類はどれですか。

- A. 数値
- B. 文字列
- C. 真偽値

<details>
<summary>答え</summary>

**C** — 含めばtrue、含まなければfalseを返します。

</details>

### Q3. "ABCDEF".slice(1, 3) の結果はどれですか。

- A. "ABC"
- B. "BC"
- C. "BCD"

<details>
<summary>答え</summary>

**B** — インデックスは0始まりなので1は"B"、終了の3は含まないので"BC"です。

</details>

### Q4. 利用者の入力と "ok" を、表記の揺れを許して比べる書き方はどれですか。

- A. input === "ok"
- B. input.toLowerCase() === "ok"
- C. input === "OK"

<details>
<summary>答え</summary>

**B** — 比べる直前に表記をそろえるのが型です。===そのものは揺れを許しません。

</details>

### Q5. 文字列の中の対象をすべて置き換えるメソッドはどれですか。

- A. replace
- B. replaceAll
- C. slice

<details>
<summary>答え</summary>

**B** — replaceは最初の1つだけ置き換えます。全部ならreplaceAllです。

</details>
