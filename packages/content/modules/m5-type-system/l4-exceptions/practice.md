# レッスン5-4 演習 — 例外処理

対象トピック: 5-4-1 〜 5-4-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const divide = (a: number, b: number): number => {
  if (b === 0) {
    throw new Error("0では割れません");
  }
  return a / b;
};

try {
  console.log(divide(10, 2)); // => 5
  console.log(divide(10, 0));
  console.log("ここは実行されない");
} catch (error) {
  if (error instanceof Error) {
    console.log(`失敗: ${error.message}`);
  }
} finally {
  console.log("終了");
}
```

写経できたら、次の改造をしてみましょう。

1. `divide(10, 0)` を `divide(10, 5)` に変えて、`catch`が通らないことを確認しましょう
2. `if (error instanceof Error)` を消して、`error.message`にどんなエラーが出るか読みましょう
3. `finally`のブロックが、成功時も失敗時も実行されることを確認しましょう

## 演習問題

### 問1(基本)

年齢を受け取り、0未満なら「年齢が不正です」という例外を投げる関数`checkAge`を書いてください。正常なら年齢をそのまま返します。

### 問2(基本)

問1の関数を`try` / `catch`で呼び出し、失敗したときはメッセージを表示してください。`instanceof Error`で確かめてから`message`を読んでください。

### 問3(応用)

次のコードはエラーになります。理由を説明し、直してください。

```ts
try {
  throw new Error("ネットワークエラー");
} catch (error) {
  console.log(error.message);
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const checkAge = (age: number): number => {
  if (age < 0) {
    throw new Error("年齢が不正です");
  }
  return age;
};

console.log(checkAge(28)); // => 28
```

異常な値を返すのではなく、`throw`で処理を止めます。呼び出し側が確認を忘れても、異常な値が先へ流れることはありません。

</details>

<details>
<summary>問2の解答例</summary>

```ts
try {
  console.log(checkAge(-5));
} catch (error) {
  if (error instanceof Error) {
    console.log(`エラー: ${error.message}`);
  } else {
    console.log("不明なエラー");
  }
}
// => "エラー: 年齢が不正です"
```

`try`の中で例外が起きると、その時点で`catch`へ移ります。`console.log(checkAge(-5))`の表示は実行されません。

</details>

<details>
<summary>問3の解答例</summary>

```ts
try {
  throw new Error("ネットワークエラー");
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message); // => "ネットワークエラー"
  } else {
    console.log("不明なエラー");
  }
}
```

「'error' is of type 'unknown'.」というエラーです。`catch`で受け取る値は`unknown`型なので、そのままでは何もできません。

JavaScriptは`Error`以外(文字列や数値)も`throw`できるため、`catch`する側は何が来るか分かりません。だから型は`unknown`になっています。

`instanceof Error`で確かめてから`message`を読みます。この形は実務でそのまま使える定型です。

</details>

## 確認クイズ

### Q1. `throw`と`return`の違いはどれですか?

- A. どちらも値を返して呼び出し元は続行する
- B. `throw`は呼び出し元も巻き込んで止まる
- C. `throw`は関数の中だけで止まる

<details>
<summary>答え</summary>

**B** — 誰も受け止めなければ、プログラム全体が停止します。

</details>

### Q2. `finally`のブロックはいつ実行されますか?

- A. 例外が起きたときだけ
- B. 例外が起きなかったときだけ
- C. どちらの場合も

<details>
<summary>答え</summary>

**C** — 後片付けに使います。省略も可能です。

</details>

### Q3. `catch (error)` の`error`の型はどれですか?

- A. `Error`
- B. `unknown`
- C. `any`

<details>
<summary>答え</summary>

**B** — `Error`以外もthrowできるため、何が来るか分かりません。使う前に`instanceof Error`などで確かめます。

</details>
