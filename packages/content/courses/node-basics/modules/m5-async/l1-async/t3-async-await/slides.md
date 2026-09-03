---
id: 5-1-3
title: awaitで結果がそろうまで待つ
takeaway: "awaitを付けると、Promiseの結果が返るまで待ってから次の行へ進む"
introduces: [await, async]
requires: [Promise, 非同期処理, 関数, fs]
header: "Node.js 入門"
---

<!-- _class: lead -->

# 5-1-3
# awaitで結果がそろうまで待つ

Node.js 入門 — Module 5 / レッスン5-1

<!-- ノート: M4 で形として使ってきた await の正体を、ここで回収します。 -->

---

## なぜ必要か

- 引換券のままでは、中身を使った処理が書けない
- 読み込んだ内容を集計する、という当たり前のことがしたい

<!-- ノート: つかみ。前トピックで見た pending の続きです。 -->

---

## 結論

**awaitを付けると、Promiseの結果が返るまで待ってから次の行へ進む**

- **await** — 結果がそろうまで待つ印
- **async** — `await` を使う関数に付ける印

<!-- ノート: 結論を先に言い切ります。M4 で書いていた await はこれだった、と結びつけます。 -->

---

## 待ってから使う

```js
import { readFile } from "node:fs/promises";

const text = await readFile("memo.txt", "utf-8");   // 待つ
console.log(text);                                   // 中身が使える

async function load() {          // 関数の中で使うには async が要る
  return await readFile("memo.txt", "utf-8");
}
```

<!-- ノート: トップレベルの await は ES Modules だから書けます。CommonJS では書けないと補足します。 -->

---

<!-- _class: summary -->

## まとめ

**awaitを付けると、Promiseの結果が返るまで待ってから次の行へ進む**

<!-- ノート: 結論の再掲だけ。次は待った先で失敗したときの受け方です。 -->
