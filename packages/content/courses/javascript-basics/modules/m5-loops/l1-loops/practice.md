# レッスン5-1 演習 — 繰り返す

対象トピック: 5-1-1 〜 5-1-5

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `loops.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const tasks = ["見積作成", "レビュー", "報告書"];
    for (const task of tasks) {
      console.log(`TODO: ${task}`);
    }
    for (let i = 1; i <= 3; i += 1) {
      console.log(`${i}回目`);
    }
  </script>
</body>
```

2. TODOが3行、回数が3行出ることを確かめる

書けたら、次の改造を試してみましょう。

1. tasksに要素をpushで足して、コードを変えずにループの周回が増えることを確かめる
2. for...ofの中に `if (task === "レビュー") { continue; }` を足して、その行だけ飛ぶことを確かめる
3. continueをbreakに変えて、そこで打ち切られる違いを確かめる
4. カウンターのforの `i += 1` を一時的に消すとどうなるか、**実行せずに** 予想する(無限ループ)。予想したら戻す

## 演習問題

### 問1(基本)

配列 `const prices = [1200, 800, 1500];` の合計を、for...ofと更新(+=)を使って計算し、表示するコードを書いてください。

### 問2(基本)

1から10までの数のうち、偶数だけを表示するコードを、forとcontinueを使って書いてください(偶数の判定は `% 2` を使う)。

### 問3(応用)

次のコードは無限ループになります。原因を指摘し、直してください。

```js
let stock = 10;
while (stock > 0) {
  console.log(`出荷しました。残り${stock}個`);
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
const prices = [1200, 800, 1500];
let total = 0;
for (const price of prices) {
  total += price;
}
console.log(total);  // => 3500
```

合計はループの外でletで宣言し、各周で足し込みます。

</details>

<details>
<summary>問2の解答例</summary>

```js
for (let i = 1; i <= 10; i += 1) {
  if (i % 2 !== 0) {
    continue;
  }
  console.log(i);
}
```

奇数の周をcontinueで飛ばします。`if (i % 2 === 0) { console.log(i); }` と書いても同じ結果です。

</details>

<details>
<summary>問3の解答例</summary>

条件の中の変数 `stock` が本体で更新されていないため、条件が永遠にtrueのままです。本体に `stock -= 1;` を足せば止まります。

```js
let stock = 10;
while (stock > 0) {
  stock -= 1;
  console.log(`出荷しました。残り${stock}個`);
}
```

</details>

## 確認クイズ

### Q1. 配列の全要素に同じ処理をする書き方として、この講座の基本はどれですか。

- A. for...of
- B. while
- C. switch

<details>
<summary>答え</summary>

**A** — 配列の全部に対してはfor...ofが基本です。whileは条件が続く限りの繰り返しに使います。

</details>

### Q2. for (let i = 0; i < 3; i += 1) のループは何回まわりますか。

- A. 2回
- B. 3回
- C. 4回

<details>
<summary>答え</summary>

**B** — iは0、1、2の3回です。i < 3なので3になった時点で抜けます。

</details>

### Q3. 無限ループの典型的な原因はどれですか。

- A. 条件を偽にする更新を書き忘れた
- B. 配列が空だった
- C. console.logを書きすぎた

<details>
<summary>答え</summary>

**A** — 条件の中の変数が本体で動いていないと、条件が永遠にtrueのままになります。

</details>

### Q4. continueの説明として正しいものはどれですか。

- A. ループ全体をそこで終了する
- B. その回の残りを飛ばして次の周へ進む
- C. ループを最初からやり直す

<details>
<summary>答え</summary>

**B** — 全部やめるのがbreak、今回だけやめるのがcontinueです。

</details>
