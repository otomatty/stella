---
id: 1-3-2
title: number型
takeaway: "TypeScriptは整数と小数を区別しない。数値はすべてnumber型"
introduces: [四則演算]
requires: [number, 型注釈, 型推論]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 1-3-2
# number型

TypeScript入門 — Module 1 / レッスン1-3

<!-- ノート: 全体地図が頭に入ったので、いちばん出番の多いnumber型から見ていきます。 -->

---

## なぜ必要か

- 他の言語では整数と小数で型が分かれていることが多い
- 「金額は整数型、税率は小数型」と考えると、TypeScriptでは迷子になる

<!-- ノート: つかみ。JavaやC言語の経験者ほど混乱しやすいポイント。未経験者にはむしろ朗報なので、シンプルに伝える。 -->

---

## 結論

**TypeScriptは整数と小数を区別しない。数値はすべてnumber型**

- マイナスも小数も、まとめて`number`

<!-- ノート: 結論を先に言い切る。整数用・小数用と型が分かれる言語もあるが、TypeScriptは1つだけ。覚えることが減るという意味でありがたい仕様。 -->

---

## 最小のコード

```ts
const price = 300; // number
const taxRate = 0.1; // number
const temperature = -3.5; // number

const subtotal = price * 4;
console.log(subtotal); // => 1200
```

- `+` `-` `*` `/` で四則演算ができる

<!-- ノート: 3つとも同じnumber型に推論されることを確認する。掛け算はアスタリスク、割り算はスラッシュという記号の読み替えを丁寧に。計算結果を変数に入れて使い回せることも業務計算の基本形として見せる。 -->

---

<!-- _class: summary -->

## まとめ

**TypeScriptは整数と小数を区別しない。数値はすべてnumber型**

<!-- ノート: 結論の再掲だけ。ただし小数には1つだけ注意点がある、と引きを作って次につなぐ。 -->
