---
id: 5-6-3
title: as const
takeaway: "as constを付けると、値がそのままリテラル型に固定される"
introduces: [as const]
requires: [リテラル型, 型推論, オブジェクト, const, readonly, 配列]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 5-6-3
# as const

TypeScript入門 — Module 5 / レッスン5-6

<!-- ノート: 1-5-4で「constは狭く、letは広く推論される」と学びました。ところがオブジェクトの中では、その狭さが効きません。その解決策です。 -->

---

## なぜ必要か

- `const`で宣言しても、オブジェクトのプロパティは広い型に推論される
- 設定値をそのまま型として使いたい場面で困る

<!-- ノート: つかみ。1-5-4の続き。constで宣言したオブジェクトでも、中のプロパティは書き換え可能なのでstringと推論される(3-2-2の「中身は変えられる」と同じ理屈)。 -->

---

## 結論

**`as const`を付けると、値がそのままリテラル型に固定される**

- 中のプロパティまで再帰的に`readonly`になる

<!-- ノート: 結論を先に言い切る。asは「〜として」の意味。値の後ろに as const と書くだけ。3-4-3で学んだreadonlyが自動で付く。 -->

---

## 付けないとき / 付けたとき

```ts
const config1 = { env: "production" };
// 推論: { env: string }

const config2 = { env: "production" } as const;
// 推論: { readonly env: "production" }
```

<!-- ノート: Playgroundで両方にカーソルを乗せて見比べさせる。上はstring、下はリテラル型。この違いが、次のスライドの使い道につながる。 -->

---

## 使い道: 値から型を作る

```ts
const STATUSES = ["todo", "doing", "done"] as const;

type Status = (typeof STATUSES)[number];
// "todo" | "doing" | "done"
```

<!-- ノート: 対比枠。配列に as const を付けると、値からリテラルのユニオン型を作れる。値と型の二重管理がなくなり、配列に足せば型も自動で増える。typeofと[number]の仕組みはModule 6で扱うので、いまは「こういうことができる」という紹介にとどめる。 -->

---

<!-- _class: summary -->

## まとめ

**`as const`を付けると、値がそのままリテラル型に固定される**

<!-- ノート: 結論の再掲だけ。型注釈を付けると推論が失われるという別の悩みがあると引きを作って締める。 -->
