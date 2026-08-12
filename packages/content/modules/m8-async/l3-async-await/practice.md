# レッスン8-3 演習 — async/await

対象トピック: 8-3-1 〜 8-3-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const order = async (stock: number): Promise<string> => {
  if (stock === 0) {
    throw new Error("在庫切れです");
  }
  return "コーヒー";
};

const main = async (): Promise<void> => {
  try {
    const item = await order(5);
    console.log(`${item}をご用意しました`);
  } catch (error) {
    if (error instanceof Error) {
      console.log("失敗:", error.message);
    }
  } finally {
    console.log("処理終了");
  }
};

main();
```

写経できたら、次の改造をしてみましょう。

1. `order(0)`に変えて、`catch`が動くことを確認しましょう
2. `await`を消して`const item = order(5);`にし、`item`にカーソルを乗せて型を確認しましょう
3. `main`の外で`await`を書いて、どんなエラーが出るか読みましょう

## 演習問題

### 問1(基本)

1秒待ってから「完了」を返す`async`関数`finish`を書いてください。`await`で結果を受け取って表示してください。

(1秒待つには、`await new Promise((resolve) => setTimeout(resolve, 1000));` が使えます)

### 問2(基本)

次の`then`チェーンを、`async`/`await`で書き直してください。

```ts
const getName = async (): Promise<string> => "コーヒー";

getName()
  .then((name) => `${name}を注文`)
  .then((message) => console.log(message));
```

### 問3(応用)

商品IDを受け取り、次のように動く`async`関数`findProduct`を書いてください。呼び出し側では`try`-`catch`-`finally`を使い、`instanceof Error`で確かめてからメッセージを表示してください。

- IDが1以上なら「ブレンドコーヒー」を返す
- IDが0以下なら`Error`を投げる

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const finish = async (): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return "完了";
};

const main = async (): Promise<void> => {
  const result = await finish();
  console.log(result); // 1秒後 => "完了"
};

main();
```

`await`は`async`関数の中でしか書けないので、呼び出し側も`async`関数にします。

`return "完了"`と書くだけで`Promise<string>`になる点が`async`の便利さです。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const getName = async (): Promise<string> => "コーヒー";

const main = async (): Promise<void> => {
  const name = await getName();
  const message = `${name}を注文`;
  console.log(message); // => "コーヒーを注文"
};

main();
```

`then`のコールバックの中でしか使えなかった値が、普通の変数として受け取れます。処理が増えても入れ子にならず、上から順に読めます。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const findProduct = async (id: number): Promise<string> => {
  if (id <= 0) {
    throw new Error(`商品が見つかりません(id: ${id})`);
  }
  return "ブレンドコーヒー";
};

const main = async (): Promise<void> => {
  try {
    const name = await findProduct(0);
    console.log(`見つかりました: ${name}`);
  } catch (error) {
    if (error instanceof Error) {
      console.log("失敗:", error.message);
    } else {
      console.log("不明なエラー");
    }
  } finally {
    console.log("検索終了");
  }
};

main();
// => "失敗: 商品が見つかりません(id: 0)"
// => "検索終了"
```

`async`関数の中では`reject`ではなく`throw`を書けます。受ける側はレッスン5-4の`try`-`catch`そのままです。

`catch`の引数は非同期でも`unknown`なので、`instanceof Error`で確かめてから`message`を読みます。

</details>

## 確認クイズ

### Q1. `async`を付けた関数の戻り値は何になりますか?

- A. 書いたとおりの型
- B. `Promise`で包まれた型
- C. `void`

<details>
<summary>答え</summary>

**B** — `return "abc"`と書いても、実際に返るのは`Promise<string>`です。

</details>

### Q2. `await`が書ける場所はどこですか?

- A. どこでも
- B. `async`関数の中だけ
- C. `try`ブロックの中だけ

<details>
<summary>答え</summary>

**B** — `async`関数の外で書くとエラーになります。

</details>

### Q3. `await`を書き忘れるとどうなりますか?

- A. エラーになる
- B. `Promise`そのものが変数に入る
- C. 何も起きない

<details>
<summary>答え</summary>

**B** — 表示すると`Promise { <pending> }`になります。型を確認すれば気づけます。

</details>

### Q4. `await`した処理が失敗したとき、どう受け止めますか?

- A. `.catch()`をつなぐ
- B. `try`-`catch`で囲む
- C. 受け止められない

<details>
<summary>答え</summary>

**B** — rejectされたPromiseを`await`すると例外として投げられるので、レッスン5-4の`try`-`catch`がそのまま使えます。

</details>

### Q5. `fetch`で取得したデータの型は保証されますか?

- A. 保証される
- B. 保証されない。`as`で言い張っているだけ

<details>
<summary>答え</summary>

**B** — 実行時に検査されるわけではありません。本番では検査ライブラリーを使います。

</details>
