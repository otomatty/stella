# レッスン5-4 例外処理

## このレッスンの目標

- [ ] `throw`で異常を伝えられる
- [ ] `try` / `catch` / `finally`の役割を説明できる
- [ ] `catch`で受け取った値を安全に扱える

## 5-4-1 throwで異常を投げる

> **`throw`は処理を中断し、呼び出し元まで異常を伝える**

「割る数が0」のような、処理を続けられない状況があります。戻り値で異常を伝える方法(`-1`を返す、`null`を返す)もありますが、呼び出し側が確認を忘れると異常な値がそのまま流れていきます。

- **例外** — 処理を続けられない状況
- **`Error`** — 例外の内容を表す組み込みの型

```ts
const divide = (a: number, b: number): number => {
  if (b === 0) {
    throw new Error("0では割れません");
  }
  return a / b;
};

console.log(divide(10, 2)); // => 5
console.log(divide(10, 0)); // ここで処理が止まる
```

`new Error("メッセージ")`で例外を作ります(`new`はModule 7のクラスで正式に扱います。いまは決まり文句として覚えてください)。

レッスン4-1の`return`も処理を終えますが、あちらは**正常な出口**です。`throw`は非常口で、呼び出し元も巻き込んで止まります。

| | 呼び出し元 |
| --- | --- |
| `return` | 値を受け取って続行する |
| `throw` | **一緒に止まる** |

誰も受け止めなければ、プログラム全体が停止します。

## 5-4-2 try-catch-finally

> **`try`で囲むと、投げられた例外を`catch`で受け止められる**

エラーで画面が真っ白になるのは、受け止め損ねている状態です。止まってよい場所と、止まっては困る場所を分ける必要があります。

- **`try`** — 例外が起きるかもしれない処理
- **`catch`** — 起きたときの処理
- **`finally`** — 起きても起きなくても最後に実行

```ts
try {
  console.log(divide(10, 0));
} catch (error) {
  console.log("計算に失敗しました");
}
// => "計算に失敗しました"
```

`try`の中で例外が起きると、その時点で残りは飛ばされて`catch`へ移ります。**プログラムは止まらず先へ進みます。**

```ts
try {
  console.log(divide(10, 0));
} catch (error) {
  console.log("失敗");
} finally {
  console.log("処理を終了します");
}
// => "失敗"
// => "処理を終了します"
```

`finally`は成功しても失敗しても通ります。後片付け(接続を閉じる、読み込み中の表示を消す)に使います。省略も可能です。

## 5-4-3 catchの引数はunknown

> **`catch`で受け取る値は`unknown`。使う前に確かめる必要がある**

このレッスンを5-3の直後に置いた理由がここです。

```ts
try {
  throw new Error("0では割れません");
} catch (error) {
  console.log(error.message);
  // エラー: 'error' is of type 'unknown'.
}
```

5-3-2で見たのとまったく同じエラーメッセージです。**投げられるのは`Error`とは限りません。** JavaScriptは文字列でも数値でも`throw`できてしまうので、`catch`する側は何が来るか分かりません。だから`unknown`になっています。

確かめてから使います。

```ts
try {
  throw new Error("0では割れません");
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message); // => "0では割れません"
  } else {
    console.log("不明なエラー");
  }
}
```

`instanceof`は「その種類のものか」を判定する型ガードです(Module 7のクラスで詳しく扱います)。いまは**`Error`かどうかを確かめる決まり文句**として覚えてください。この形は実務でそのまま使えます。

## もっと知りたい人へ

- [例外処理](https://typescriptbook.jp/reference/statements/exception) — try-catch-finallyの詳しい説明

---

演習は [practice.md](practice.md) にあります。
