---
id: 0-1-2
title: サーバーのTypeScriptにはDOMが無い
takeaway: "サーバー側のTypeScriptでは、DOMの代わりにNode.jsの機能に型を付けて使う"
introduces: [DOM, 型定義]
requires: [TypeScript, 型]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 0-1-2
# サーバーのTypeScriptにはDOMが無い

TypeScript 入門（サーバー） — Module 0 / レッスン0-1

<!-- ノート: フロントの TypeScript 入門との違いを最初に切り分けます。別講座である理由がここです。 -->

---

## なぜ必要か

- ブラウザ向けのTypeScriptの記事をまねすると、`document` が出てくる
- サーバー側では、その前提がそのまま当てはまらない

<!-- ノート: つかみ。Node.js 入門 0-1-2 で扱った対比を、型の文脈で繰り返します。 -->

---

## 結論

**サーバー側のTypeScriptでは、DOMの代わりにNode.jsの機能に型を付けて使う**

- **DOM** — ブラウザが持つ画面のしくみ。サーバーには無い
- **型定義** — ライブラリや環境の機能に、型の情報を与えるファイル

<!-- ノート: 結論を先に言い切ります。@types/node の存在理由につながります。 -->

---

## 扱う対象が違うだけ

```ts
// ブラウザ向け
document.getElementById("app");     // サーバーでは使えない

// サーバー向け
import { readFile } from "node:fs/promises";
const text: string = await readFile("memo.txt", "utf-8");
```

- 言語は同じ。型を付ける対象が、画面ではなくファイルや通信になる

<!-- ノート: 覚え直しではないと安心させます。フロントの TypeScript 入門とは前提も到達点も別です。 -->

---

<!-- _class: summary -->

## まとめ

**サーバー側のTypeScriptでは、DOMの代わりにNode.jsの機能に型を付けて使う**

<!-- ノート: 結論の再掲だけ。次はこの講座の範囲を確認します。 -->
