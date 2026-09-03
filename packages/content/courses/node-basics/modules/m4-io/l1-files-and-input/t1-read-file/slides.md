---
id: 4-1-1
title: node:fsでファイルを読む
takeaway: "node:fs/promisesのreadFileで、ファイルの中身を文字列として読み込める"
introduces: [fs, 文字エンコーディング]
requires: [組み込みモジュール, import, 変数, 関数]
header: "Node.js 入門"
---

<!-- _class: lead -->

# 4-1-1
# node:fsでファイルを読む

Node.js 入門 — Module 4 / レッスン4-1

<!-- ノート: ブラウザにはできない操作の第一歩です。Node.js を使う理由そのものに触れます。 -->

---

## なぜ必要か

- 設定ファイルやCSVを読んで処理したい
- ブラウザのJavaScriptにはできなかったことが、ここでできる

<!-- ノート: つかみ。0-1-2 の対比表を思い出させます。 -->

---

## 結論

**node:fs/promisesのreadFileで、ファイルの中身を文字列として読み込める**

- **fs** — file system。ファイルを扱う組み込みモジュール

<!-- ノート: 結論を先に言い切ります。await の詳細は M5 で扱うので、ここでは形として渡します。 -->

---

## 最小のコード

```js
import { readFile } from "node:fs/promises";

const text = await readFile("memo.txt", "utf-8");
console.log(text);
```

- 第2引数の `"utf-8"` は **文字エンコーディング**。省くと文字ではなく生のデータになる

<!-- ノート: utf-8 の指定忘れは頻出です。Buffer の詳細には踏み込みません。 -->

---

<!-- _class: summary -->

## まとめ

**node:fs/promisesのreadFileで、ファイルの中身を文字列として読み込める**

<!-- ノート: 結論の再掲だけ。次は書き込みです。 -->
