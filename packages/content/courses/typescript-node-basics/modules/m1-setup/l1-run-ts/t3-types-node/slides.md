---
id: 1-1-3
title: Node.jsの型定義を入れる
takeaway: "@types/nodeを入れると、processやnode:fsに型が付いて補完と検査が効く"
introduces: ["@types/node"]
requires: [型定義, tsconfig.json, コンパイル]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 1-1-3
# Node.jsの型定義を入れる

TypeScript 入門（サーバー） — Module 1 / レッスン1-1

<!-- ノート: 「Cannot find name 'process'」で詰まる定番の回です。原因と対処を1つに絞ります。 -->

---

## なぜ必要か

- `process.argv` と書いたら `Cannot find name 'process'` と怒られた
- Node.jsの機能なのに、なぜ知らないと言われるのか分からない

<!-- ノート: つかみ。実際に出るエラーメッセージから入ります。 -->

---

## 結論

**@types/nodeを入れると、processやnode:fsに型が付いて補完と検査が効く**

- **@types/node** — Node.jsの機能に型を与えるパッケージ

<!-- ノート: 結論を先に言い切ります。TypeScript は Node.js の存在を最初から知らない、が理由です。 -->

---

## 型定義も開発用の道具

```bash
npm install -D @types/node
```

```ts
const port: string | undefined = process.env.PORT;   // 型が付く
```

- 実行時には何も足されない。型情報だけを与えるパッケージ

<!-- ノート: 実行に影響しないから devDependencies でよい、と結びつけます。 -->

---

<!-- _class: summary -->

## まとめ

**@types/nodeを入れると、processやnode:fsに型が付いて補完と検査が効く**

<!-- ノート: 結論の再掲だけ。次は書いたコードを実際に動かします。 -->
