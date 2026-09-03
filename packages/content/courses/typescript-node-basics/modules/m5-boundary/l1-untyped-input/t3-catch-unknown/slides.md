---
id: 5-1-3
title: catchで受け取る値もunknown
takeaway: "catchの引数はunknownなので、メッセージを読む前に種類を確認する"
introduces: [Error]
requires: [unknown, any, 戻り値]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 5-1-3
# catchで受け取る値もunknown

TypeScript 入門（サーバー） — Module 5 / レッスン5-1

<!-- ノート: Node.js 入門の try-catch が、型の観点で厳しくなる場面です。 -->

---

## なぜ必要か

- `catch (error)` の中で `error.message` と書いたらエラーになった
- 失敗の内容を伝えたいだけなのに、書き方が分からない

<!-- ノート: つかみ。誰もが最初につまずく書き方です。 -->

---

## 結論

**catchの引数はunknownなので、メッセージを読む前に種類を確認する**

- **Error** — 失敗の情報を持つ標準の型。`message` を持つ

<!-- ノート: 結論を先に言い切ります。投げられるのは Error とは限らない、が理由です。 -->

---

## 種類を確かめてから読む

```ts
try {
  await readFile("memo.txt", "utf-8");
} catch (error) {
  if (error instanceof Error) {
    console.error("読めません: " + error.message);
  } else {
    console.error("読めません(詳細不明)");
  }
}
```

<!-- ノート: instanceof で確認すると、その中では Error として扱えます。絞り込みの一種です。 -->

---

<!-- _class: summary -->

## まとめ

**catchの引数はunknownなので、メッセージを読む前に種類を確認する**

<!-- ノート: 結論の再掲だけ。次は、確認をどこに置くかという設計の話です。 -->
