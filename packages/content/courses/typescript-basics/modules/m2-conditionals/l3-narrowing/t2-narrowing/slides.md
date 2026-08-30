---
id: 2-3-2
title: 条件分岐で型が確定する
takeaway: "ifで値の有無を確かめると、そのブロックの中では型が確定する"
introduces: [絞り込み]
requires: [if, ユニオン型, undefined, strictNullChecks, 型注釈]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 2-3-2
# 条件分岐で型が確定する

TypeScript入門 — Module 2 / レッスン2-3

<!-- ノート: レッスン1-6の最後に「値があるか確かめてから使う書き方はModule 2で学ぶ」と予告しました。その回収がここです。 -->

---

## なぜ必要か

- `string | undefined` の値は、そのままでは`string`として使えない
- 使うたびにエラーが出るのでは、型が邪魔者になってしまう

<!-- ノート: つかみ。1-6-5で書いた「空になりうる値」の型を、実際に使う方法。ここが通ると、型は制約ではなく道具だという実感に変わる。 -->

---

## 結論

**`if`で値の有無を確かめると、そのブロックの中では型が確定する**

- この働きを絞り込みと呼ぶ
- コンパイラーが条件を読んで、型を狭めてくれる

<!-- ノート: 結論を先に言い切る。絞り込みという言葉を定義する。人が「大丈夫だ」と主張するのではなく、コンパイラーが条件から判断してくれる点が重要。TypeScriptの中でも特に賢い部分。 -->

---

## 最小のコード

```ts
const phone: string | undefined = "090-1234-5678";

const display: string = phone;
// エラー: Type 'string | undefined' is not
// assignable to type 'string'.
```

- `undefined`かもしれないので、`string`としては受け取れない

<!-- ノート: まず失敗を見せる。値が入っているように見えても、型の上ではundefinedの可能性が残っている。だからコンパイラーは通さない。 -->

---

## ifで囲むと通る

```ts
const phone: string | undefined = "090-1234-5678";

if (phone !== undefined) {
  const display: string = phone; // OK
  console.log(display); // => "090-1234-5678"
}
```

<!-- ノート: 対比枠。同じ代入が、ifの中では通る。ブロックの中ではphoneの型がstringに確定しているため。Playgroundでphoneにマウスカーソルを乗せると、内と外で表示される型が違うことを確認できる。 -->

---

<!-- _class: summary -->

## まとめ

**`if`で値の有無を確かめると、そのブロックの中では型が確定する**

<!-- ノート: 結論の再掲だけ。毎回ifで囲むのは少し長いので、短く書く方法を次に見ると予告して締める。 -->
