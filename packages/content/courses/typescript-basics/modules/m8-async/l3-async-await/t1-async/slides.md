---
id: 8-3-1
title: async関数
takeaway: "asyncを付けた関数は、returnした値が自動でPromiseに包まれる"
introduces: [async]
requires: [Promise, 関数, 戻り値, アロー関数, 型注釈, return]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 8-3-1
# async関数

TypeScript入門研修 — Module 8 / レッスン8-3

<!-- ノート: レッスン8-3は async/await です。Promiseを同期処理のように書ける記法で、実務のコードはほぼこの形をしています。 -->

---

## なぜ必要か

- `new Promise(...)`を毎回書くのは長い
- `then`のチェーンも、長くなると読みにくい

<!-- ノート: つかみ。8-2で書いたコードを思い出してもらう。動くが、定型部分が多い。もっと短く、普通の関数のように書きたい。 -->

---

## 結論

**`async`を付けた関数は、`return`した値が自動で`Promise`に包まれる**

<!-- ノート: 結論を先に言い切る。asyncは asynchronous(非同期)の略。関数の前に付けるだけで、その関数は必ずPromiseを返す関数になる。 -->

---

## 最小のコード

```ts
const getName = async (): Promise<string> => {
  return "コーヒー";
};

getName().then((name) => console.log(name)); // => "コーヒー"
```

- `return "コーヒー"` だけで`Promise<string>`になる

<!-- ノート: new Promise も resolve も書いていない。戻り値の型は Promise<string> と書く(中身の型ではない点に注意)。8-2-3で学んだ書き方がそのまま使える。 -->

---

## Promiseで書いた場合と比べる

```ts
// asyncなし
const getName = (): Promise<string> => {
  return new Promise((resolve) => resolve("コーヒー"));
};

// asyncあり
const getName = async (): Promise<string> => "コーヒー";
```

<!-- ノート: 対比枠。同じ動きで、書く量がまったく違う。ただしasyncを付けただけでは待つことはできない。待つための記法が次のトピック。 -->

---

<!-- _class: summary -->

## まとめ

**`async`を付けた関数は、`return`した値が自動で`Promise`に包まれる**

<!-- ノート: 結論の再掲だけ。では結果を待って受け取るにはどうするのか、という問いを残して締める。 -->
