---
id: 8-2-3
title: Promiseの型
takeaway: "Promise<T>のTには、成功したときの結果の型を書く"
introduces: []
requires: [Promise, ジェネリクス, 型引数, 型注釈, 戻り値, void]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 8-2-3
# Promiseの型

TypeScript入門研修 — Module 8 / レッスン8-2

<!-- ノート: Module 6でジェネリクスを学んでおいた理由が、ここで明らかになります。新しい記法は1つも出てきません。 -->

---

## なぜ必要か

- 非同期処理を関数にすると、戻り値の型を書く必要がある
- `Promise`だけでは「何が入っているか」が分からない

<!-- ノート: つかみ。4-4-2で「戻り値の型は書く」と決めた。では非同期の関数は何と書くのか。答えはModule 6で既に学んでいる。 -->

---

## 結論

**`Promise<T>`の`T`には、成功したときの結果の型を書く**

- 6-1-2で学んだ型引数そのもの
- `Promise<string>` = 「結果が文字列のPromise」

<!-- ノート: 結論を先に言い切る。山かっこはジェネリクスの記法。6-1-3で「実はもう使っていた」と話したmapと同じ。新しく覚えることはゼロだと強調する。 -->

---

## 最小のコード

```ts
const order = (item: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(`${item}ができました`), 1000);
  });
};

order("コーヒー").then((message) => console.log(message));
```

- `then`の`message`が`string`だと分かる

<!-- ノート: 戻り値の型を書いておくと、then のコールバックの引数の型が自動で決まる。Playgroundでカーソルを乗せて確認させる。6-1-1で見た「入口と出口の型がつながる」がここでも効いている。 -->

---

## 省略できない / 結果がないとき

```ts
const wait = (): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 1000));
};
```

- 山かっこは省略できない(型引数が必須)
- 返す値がなければ`Promise<void>`

<!-- ノート: 対比枠。省略すると「Generic type 'Promise<T>' requires 1 type argument(s).」というエラーになる。4-4-1で学んだvoidが、ここで組み合わせとして出てくる。 -->

---

<!-- _class: summary -->

## まとめ

**`Promise<T>`の`T`には、成功したときの結果の型を書く**

<!-- ノート: 結論の再掲だけ。では失敗したときはどう受け取るのか、という問いを残して締める。 -->
