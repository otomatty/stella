# レッスン3-1 演習 — 値をリストで持つ

対象トピック: 3-1-1 〜 3-1-5

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

今回は小さな「文章ジェネレーター」を作ります。部品を配列に持ち、選んで文面を組み立てる遊びです。

1. `generator.html` を作り、次を書いて保存する

```html
<body>
  <script>
    const names = ["佐藤", "鈴木", "高橋"];
    const places = ["会議室A", "リフレッシュルーム", "屋上"];
    const actions = ["資料を読んでいた", "昼寝していた", "拍手していた"];
    const story = `${names[0]}さんは${places[1]}で${actions[2]}`;
    console.log(story);
  </script>
</body>
```

2. コンソールに `佐藤さんはリフレッシュルームで拍手していた` と出ることを確かめる

書けたら、次の改造を試してみましょう。

1. インデックスの数字を変えて、別の組み合わせの文を作る
2. `names.push("田中");` を足してから `names[3]` を使い、追加した要素が使えることを確かめる
3. `console.log(names.join("・"));` で、登場人物の一覧を1行にして表示する
4. `const words = "月曜,水曜,金曜".split(",");` で配列を作り、`words[1]` を文に混ぜる

## 演習問題

### 問1(基本)

次のコードの出力をそれぞれ答えてください。

```js
const items = ["ペン", "ノート", "消しゴム"];
console.log(items[0]);
console.log(items.length);
console.log(items[items.length - 1]);
```

### 問2(基本)

配列 `const queue = ["A", "B"];` に対して、次の操作を順に行った後のqueueの中身を答えてください。

1. `queue.push("C");`
2. `queue.pop();`
3. `queue.push("D");`

### 問3(応用)

`"apple;banana;grape"` という文字列から `banana` だけを取り出すコードを、splitとインデックスを使って書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

- `"ペン"` — インデックス0は先頭
- `3` — lengthは要素の数
- `"消しゴム"` — length - 1 = 2が最後のインデックス

</details>

<details>
<summary>問2の解答例</summary>

`["A", "B", "D"]` です。pushで `["A","B","C"]` → popで `["A","B"]` → pushで `["A","B","D"]` と変化します。popが取り除くのは末尾の `"C"` です。

</details>

<details>
<summary>問3の解答例</summary>

```js
const fruits = "apple;banana;grape".split(";");
console.log(fruits[1]);  // => "banana"
```

区切り文字は `;` です。分けた結果の2番目(インデックス1)がbananaです。

</details>

## 確認クイズ

### Q1. 配列の説明として正しいものはどれですか。

- A. 複数の値を順番に持てる入れ物
- B. 文字列専用の入れ物
- C. 値を1つだけ持てる入れ物

<details>
<summary>答え</summary>

**A** — []で作り、値の順番を保って持ちます。要素の種類は文字列でも数値でも構いません。

</details>

### Q2. const list = ["a", "b", "c"] のとき、list[1] はどれですか。

- A. "a"
- B. "b"
- C. "c"

<details>
<summary>答え</summary>

**B** — インデックスは0始まりなので、1は2番目の要素です。

</details>

### Q3. 配列の末尾に要素を追加するメソッドはどれですか。

- A. pop
- B. push
- C. join

<details>
<summary>答え</summary>

**B** — pushが追加、popが取り出しです。どちらも末尾に対する操作です。

</details>

### Q4. members.indexOf("田中") が -1 を返しました。意味はどれですか。

- A. 田中は先頭にある
- B. 田中は末尾にある
- C. 田中は見つからなかった

<details>
<summary>答え</summary>

**C** — 見つからないときの合図が-1です。先頭は0なので混同しないでください。

</details>

### Q5. ["月", "水", "金"] を "月・水・金" にするコードはどれですか。

- A. `["月", "水", "金"].split("・")`
- B. `["月", "水", "金"].join("・")`
- C. `["月", "水", "金"].push("・")`

<details>
<summary>答え</summary>

**B** — 配列→文字列がjoin、文字列→配列がsplitです。

</details>
