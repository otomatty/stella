---
id: 1-6-3
title: typeofと、nullの罠
takeaway: "typeofは型名を文字列で返す。ただしnullだけは\"object\"を返す"
introduces: [typeof]
requires: [null, undefined, string, number]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 1-6-3
# typeofと、nullの罠

TypeScript入門 — Module 1 / レッスン1-6

<!-- ノート: 値の種類を実行時に調べる道具を1つ紹介します。便利ですが、1か所だけ有名な罠があります。 -->

---

## なぜ必要か

- ログに出た値が数値なのか文字列なのか、目で見てもわからないことがある
- 調べる道具がないと、当てずっぽうのデバッグになる

<!-- ノート: つかみ。"100"と100は画面上ほぼ同じに見える。1-4-3で見た「+」の事故の原因調査にも、この道具が効く。 -->

---

## 結論

**typeofは型名を文字列で返す。ただしnullだけは`"object"`を返す**

<!-- ノート: 結論を先に言い切る。前半が道具の説明、後半が罠。この罠はJavaScript初期からのバグで、互換性のため修正されずに残っている。 -->

---

## 最小のコード

```ts
console.log(typeof 100); // => "number"
console.log(typeof "田中"); // => "string"
console.log(typeof undefined); // => "undefined"
console.log(typeof null); // => "object" ← 罠
```

<!-- ノート: 上3行は素直な結果。4行目だけが"null"ではなく"object"になる。Playgroundで実際に出力して見せると印象に残る。 -->

---

## 実務での教訓

```ts
// nullかどうかの判定にtypeofを使ってはいけない
const value = null;
console.log(typeof value === "object"); // => true (nullでも通る)
```

- `null`の判定は`value === null`と直接比較する

<!-- ノート: 対比枠。豆知識で終わらせず、実務の判断につなげる。三重イコールは「等しいか」を調べる記号で、条件分岐で本格的に使うのはModule 2だと予告する。 -->

---

<!-- _class: summary -->

## まとめ

**typeofは型名を文字列で返す。ただしnullだけは`"object"`を返す**

<!-- ノート: 結論の再掲だけ。では実務でnullとundefinedをどう使い分けるのか、という問いを残して次につなぐ。 -->
