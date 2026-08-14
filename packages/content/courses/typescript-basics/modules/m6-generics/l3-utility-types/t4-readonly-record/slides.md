---
id: 6-3-4
title: ReadonlyとRecord
takeaway: "Readonlyは全プロパティを読み取り専用に、Recordは対応表の型を作る"
introduces: [Readonly, Record]
requires: [ユーティリティ型, readonly, オブジェクト, リテラル型, ユニオン型]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 6-3-4
# ReadonlyとRecord

TypeScript入門研修 — Module 6 / レッスン6-3

<!-- ノート: Module 6の最後のトピックです。実務で頻出のユーティリティ型を2つ、まとめて押さえます。 -->

---

## なぜ必要か

- 3-4-3の`readonly`を全プロパティに書くのは手間
- 「状態名 → 表示名」のような対応表の型を書きたい

<!-- ノート: つかみ。どちらも自分で書けるが、標準にあるなら使えばよい。名前が付いていることで意図も伝わる。 -->

---

## 結論

**`Readonly`は全プロパティを読み取り専用に、`Record`は対応表の型を作る**

<!-- ノート: 結論を先に言い切る。2つまとめて扱うのは、どちらも書き方が単純で、それぞれ1トピックにするほどの中身がないため。 -->

---

## Readonly: 全プロパティを読み取り専用に

```ts
type User = { name: string; age: number };

type FrozenUser = Readonly<User>;
// { readonly name: string; readonly age: number }

const user: FrozenUser = { name: "田中", age: 28 };
user.name = "佐藤";
// エラー: Cannot assign to 'name' because it is a read-only property.
```

<!-- ノート: 3-4-3で1つずつ書いたreadonlyが、全プロパティに付く。5-6-3のas constと似ているが、こちらは型に対する加工。 -->

---

## Record: キーと値の対応表

```ts
type Status = "todo" | "done";

type Labels = Record<Status, string>;
// { todo: string; done: string }

const labels: Labels = { todo: "未着手", done: "完了" };
```

<!-- ノート: 対比枠。1つ目の型引数がキー、2つ目が値の型。Statusに"doing"を足すと、labelsに書き漏れがある場合エラーになる。5-3-4の網羅性チェックと同じ効果が、型だけで得られる。 -->

---

<!-- _class: summary -->

## まとめ

**`Readonly`は全プロパティを読み取り専用に、`Record`は対応表の型を作る**

<!-- ノート: 結論の再掲だけ。Module 6はこれで終了。山かっこが読めるようになったので、次はPromiseに進めると伝えて締める。 -->
