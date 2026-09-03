---
id: 3-1-3
title: requireとimportの2つの書き方がある
takeaway: "Node.jsにはrequireを使う古い方式とimportを使う新しい方式があり、package.jsonで切り替える"
introduces: [CommonJS, ES Modules]
requires: [import, export, モジュール, package.json]
header: "Node.js 入門"
---

<!-- _class: lead -->

# 3-1-3
# requireとimportの2つの書き方がある

Node.js 入門 — Module 3 / レッスン3-1

<!-- ノート: ネットの記事で書き方が食い違う理由です。ここを知らないと延々と混乱します。 -->

---

## なぜ必要か

- 記事によって `require` だったり `import` だったりする
- まねして書いたら `Cannot use import statement outside a module` と怒られた

<!-- ノート: つかみ。実際に出るエラーメッセージを見せます。 -->

---

## 結論

**Node.jsにはrequireを使う古い方式とimportを使う新しい方式があり、package.jsonで切り替える**

- **CommonJS** — `require` を使う、Node.js独自の古い方式
- **ES Modules** — `import` を使う、JavaScript標準の方式

<!-- ノート: 結論を先に言い切ります。新規はESM、既存にCommonJSがあれば合わせる、が実務の判断です。 -->

---

## 切り替えは1行

`package.json` に次の 1 行を足すだけです。

```json
{ "type": "module" }
```

```js
import { withTax } from "./tax.js";   // ES Modules
const { withTax } = require("./tax"); // CommonJS
```

- `"type": "module"` が無いとCommonJSとして扱われる

<!-- ノート: 混ぜると事故のもとです。プロジェクト内でどちらかにそろえる、と伝えます。 -->

---

<!-- _class: summary -->

## まとめ

**Node.jsにはrequireを使う古い方式とimportを使う新しい方式があり、package.jsonで切り替える**

<!-- ノート: 結論の再掲だけ。次は自分で入れなくても使える部品の話です。 -->
