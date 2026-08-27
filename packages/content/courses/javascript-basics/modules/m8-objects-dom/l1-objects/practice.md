# レッスン8-1 演習 — オブジェクト

対象トピック: 8-1-1 〜 8-1-3

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `objects.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const tasks = [
      { title: "見積作成", done: true },
      { title: "レビュー", done: false },
      { title: "報告書", done: false },
    ];
    for (const task of tasks) {
      console.log(`${task.title}: ${task.done ? "完了" : "未完了"}`);
    }
  </script>
</body>
```

2. 3件の状態が表示されることを確かめる

書けたら、次の改造を試してみましょう。

1. `tasks[1].done = true;` で書き換えてから、もう一度ループを回して表示が変わることを確かめる
2. `tasks.filter((t) => !t.done)` で未完了だけの配列を作り、件数を表示する
3. 自分の1件(`{ title: "...", done: false }`)をpushで追加して、一覧に増えることを確かめる

## 演習問題

### 問1(基本)

社員を表すオブジェクト(`name` が `"佐藤"`、`department` が `"開発"`、`years` が `3`)をconstで宣言し、`佐藤(開発・3年目)` とテンプレートリテラルで表示するコードを書いてください。

### 問2(基本)

次のコードの出力を答えてください。

```js
const product = { name: "ノート", stock: 5 };
product.stock = product.stock - 2;
console.log(product.stock);
```

### 問3(応用)

次のデータから「価格が1000円以上の商品名だけの配列」を、filterとmapで作ってください。

```js
const items = [
  { name: "ペン", price: 120 },
  { name: "バッグ", price: 3200 },
  { name: "手帳", price: 1500 },
];
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
const employee = { name: "佐藤", department: "開発", years: 3 };
console.log(`${employee.name}(${employee.department}・${employee.years}年目)`);
```

</details>

<details>
<summary>問2の解答例</summary>

`3` です。ドット記法はプロパティの読み書き両方に使えます。constでもプロパティの書き換えはできます。

</details>

<details>
<summary>問3の解答例</summary>

```js
const names = items.filter((i) => i.price >= 1000).map((i) => i.name);
console.log(names);  // => ["バッグ", "手帳"]
```

絞り込み(filter)→変換(map)の順です。コールバックの中でドット記法を使います。

</details>

## 確認クイズ

### Q1. オブジェクトの説明として正しいものはどれですか。

- A. 名前を付けた値をひとまとめに持てる入れ物
- B. 値を順番に並べる入れ物
- C. 文字列の別名

<details>
<summary>答え</summary>

**A** — {}で作り、キー: 値の組(プロパティ)を持ちます。順番の入れ物は配列です。

</details>

### Q2. product.price の読み方として正しいものはどれですか。

- A. productオブジェクトのpriceプロパティを読む
- B. productとpriceを掛け算する
- C. priceという関数を実行する

<details>
<summary>答え</summary>

**A** — ドット記法です。書き換えるときも product.price = 150 と同じ形です。

</details>

### Q3. 「商品一覧」のデータ構造として実務で定番の形はどれですか。

- A. オブジェクトの配列
- B. 配列のキーを持つ1つの文字列
- C. 数値だけの配列

<details>
<summary>答え</summary>

**A** — 一覧は配列、1件はオブジェクトの形が定番です。ループやfilterがそのまま使えます。

</details>

### Q4. const で宣言したオブジェクトについて正しいものはどれですか。

- A. プロパティの書き換えもできない
- B. プロパティの書き換えはできるが、変数への再代入はできない
- C. 何でも自由に変えられる

<details>
<summary>答え</summary>

**B** — constが禁止するのは入れ物ごとの再代入だけです。配列の要素と同じ理屈です。

</details>
