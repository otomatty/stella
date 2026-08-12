---
id: 8-3-2
title: awaitで結果を待つ
takeaway: "awaitはPromiseの結果が出るまで待ち、中身を取り出す"
introduces: [await]
requires: [async, Promise, then, 変数, const]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 8-3-2
# awaitで結果を待つ

TypeScript入門研修 — Module 8 / レッスン8-3

<!-- ノート: Module 8の山場です。ここが書けるようになると、実務の非同期コードがそのまま読めます。 -->

---

## なぜ必要か

- `then`のコールバックの中でしか結果を使えないのは不便
- 普通の変数のように受け取れれば、同期処理と同じ書き方ができる

<!-- ノート: つかみ。8-2-2のthenは、結果の使い道がコールバックの中に閉じていた。外に持ち出せると、その後の処理が素直に書ける。 -->

---

## 結論

**`await`は`Promise`の結果が出るまで待ち、中身を取り出す**

- `await`が書けるのは`async`関数の中だけ

<!-- ノート: 結論を先に言い切る。awaitは「待つ」の意味。ただしJavaScript全体が止まるわけではなく、そのasync関数の中だけが待つ。他の処理は動き続ける。 -->

---

## 最小のコード

```ts
const order = async (item: string): Promise<string> => {
  return `${item}ができました`;
};

const main = async (): Promise<void> => {
  const message = await order("コーヒー");
  console.log(message); // => "コーヒーができました"
};

main();
```

<!-- ノート: awaitを付けると Promise<string> から string が取り出せる。messageにカーソルを乗せるとstringと表示される。8-2-2のthenで書いた場合と見比べると、入れ子がなくなっているのが分かる。 -->

---

## 止まるのは、その関数の中だけ

![w:950](assets/await-timeline.svg)

<!-- ノート: awaitで止まるのはそのasync関数の中だけ。8-1-1で見たシングルスレッドの制約は変わっていない。awaitを書き忘れると、値ではなくPromiseそのものが入ってしまい、表示が Promise { <pending> } になる。これが定番のミス。 -->

---

<!-- _class: summary -->

## まとめ

**`await`は`Promise`の結果が出るまで待ち、中身を取り出す**

<!-- ノート: 結論の再掲だけ。では失敗したときはどうなるのか、という問いを残して締める。 -->
