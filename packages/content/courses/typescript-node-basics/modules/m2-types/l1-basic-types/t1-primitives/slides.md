---
id: 2-1-1
title: 基本の型は3つ覚えれば足りる
takeaway: "まずはstring・number・booleanの3つで、扱う値のほとんどを表せる"
introduces: [string, number, boolean]
requires: [型注釈, 型, TypeScript]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 2-1-1
# 基本の型は3つ覚えれば足りる

TypeScript 入門（サーバー） — Module 2 / レッスン2-1

<!-- ノート: 型の学習はここから始まります。最初に覚える量を3つに限定します。 -->

---

## なぜ必要か

- 型の名前がたくさんあり、どれから覚えればよいか分からない
- 全部を覚えようとして、書き始める前に止まってしまう

<!-- ノート: つかみ。学習量の不安を先に取り除きます。 -->

---

## 結論

**まずはstring・number・booleanの3つで、扱う値のほとんどを表せる**

- **string** — 文字列
- **number** — 数値(整数も小数も同じ型)
- **boolean** — 真偽値(true / false)

<!-- ノート: 結論を先に言い切ります。整数と小数が同じ型なのは JavaScript 由来の特徴です。 -->

---

## 型注釈は変数名のあとに書く

```ts
const name: string = "佐藤";
const price: number = 1200;
const isActive: boolean = true;

const wrong: number = "1200";   // エラー: 文字列は入れられない
```

- 書き方は `名前: 型 = 値`

<!-- ノート: 4行目のエラーが型の効果そのものです。実演で赤い波線を見せます。 -->

---

<!-- _class: summary -->

## まとめ

**まずはstring・number・booleanの3つで、扱う値のほとんどを表せる**

<!-- ノート: 結論の再掲だけ。次は型注釈を省く判断です。 -->
