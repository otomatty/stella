# レッスン8-2 演習 — Promise

対象トピック: 8-2-1 〜 8-2-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const order = (stock: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (stock === 0) {
        reject(new Error("在庫切れです"));
        return;
      }
      resolve("コーヒー");
    }, 1000);
  });
};

order(5)
  .then((item) => console.log(`${item}をご用意しました`))
  .catch((error) => console.log("失敗:", error.message))
  .finally(() => console.log("処理終了"));
```

写経できたら、次の改造をしてみましょう。

1. `order(0)`に変えて、`catch`が動くことを確認しましょう
2. `then`のコールバックの引数`item`にカーソルを乗せ、型を確認しましょう
3. 戻り値の型を`Promise`だけにして、どんなエラーが出るか読みましょう

## 演習問題

### 問1(基本)

1秒後に「準備完了」という文字列で`resolve`する関数`prepare`を書いてください。戻り値の型注釈も付けてください。呼び出して`then`で結果を表示してください。

### 問2(基本)

問1の`prepare`を`then`でつないで、結果に「!」を足してから表示してください。`then`を2回つなげてください。

### 問3(応用)

商品IDを受け取り、次のように動く関数`findProduct`を書いてください。

- IDが1以上なら、1秒後に「商品名」で`resolve`する
- IDが0以下なら、1秒後に`Error`で`reject`する

そのうえで、`then` / `catch` / `finally` をすべて使って結果を表示してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const prepare = (): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve("準備完了"), 1000);
  });
};

prepare().then((message) => console.log(message));
// 1秒後 => "準備完了"
```

戻り値の型は`Promise<string>`です。中身の型ではなく、**Promiseで包んだ型**を書く点に注意してください。

</details>

<details>
<summary>問2の解答例</summary>

```ts
prepare()
  .then((message) => `${message}!`)
  .then((message) => console.log(message));
// 1秒後 => "準備完了!"
```

`then`は新しい`Promise`を返すので、つなげられます。1つ目の`then`で`return`した値が、2つ目の`then`の引数に入ります。

レッスン4-5の`map`・`filter`のメソッドチェーンと同じ読み方ができます。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const findProduct = (id: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id <= 0) {
        reject(new Error(`商品が見つかりません(id: ${id})`));
        return;
      }
      resolve("ブレンドコーヒー");
    }, 1000);
  });
};

findProduct(1)
  .then((name) => console.log(`見つかりました: ${name}`))
  .catch((error) => console.log("失敗:", error.message))
  .finally(() => console.log("検索終了"));
// 1秒後 => "見つかりました: ブレンドコーヒー"
// => "検索終了"
```

`findProduct(0)`に変えると、`then`が飛ばされて`catch`が動きます。`finally`はどちらの場合も動きます。

`reject`のあとに`return`を書いているのは、その先の`resolve`まで進まないようにするためです。書き忘れても`Promise`は一度しか状態が変わらないので実害は出にくいのですが、意図を明確にするために書きます。

</details>

## 確認クイズ

### Q1. Promiseの状態はいくつありますか?

- A. 2つ(成功・失敗)
- B. 3つ(保留中・成功・失敗)
- C. 制限なし

<details>
<summary>答え</summary>

**B** — 保留中から成功か失敗へ、一度だけ移ります。逆戻りも二度目もありません。

</details>

### Q2. `then`の戻り値は何ですか?

- A. コールバックが返した値そのもの
- B. 新しい`Promise`
- C. `void`

<details>
<summary>答え</summary>

**B** — 新しい`Promise`を返すので、`then`をつなげて書けます。

</details>

### Q3. 「結果が数値のPromise」を返す関数の戻り値の型はどれですか?

- A. `number`
- B. `Promise`
- C. `Promise<number>`

<details>
<summary>答え</summary>

**C** — 山かっこは省略できません。中身の型を`T`に書きます。

</details>

### Q4. `reject`されたとき、`then`と`catch`のどちらが動きますか?

- A. `then`
- B. `catch`
- C. 両方

<details>
<summary>答え</summary>

**B** — `then`は飛ばされて`catch`へ移ります。`finally`はどちらの場合も動きます。

</details>
