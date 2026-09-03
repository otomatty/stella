---
id: 2-1-3
title: 値が無いかもしれない型を表す
takeaway: "string | undefined は「文字列か、値が無いか」を表し、使う前の確認を強制する"
introduces: [ユニオン型, undefined]
requires: [string, 型推論, strict, 型注釈]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 2-1-3
# 値が無いかもしれない型を表す

TypeScript 入門（サーバー） — Module 2 / レッスン2-1

<!-- ノート: サーバー側で最も多いバグの型です。環境変数と外部入力は常にこの形になります。 -->

---

## なぜ必要か

- 環境変数を読んだら `undefined` で、そのまま使って落ちた
- 「渡されているはず」という思い込みが、そのまま障害になる

<!-- ノート: つかみ。Node.js 入門 4-1-5 で触れた undefined が、ここで型として現れます。 -->

---

## 結論

**string | undefined は「文字列か、値が無いか」を表し、使う前の確認を強制する**

- **ユニオン型** — 「AかB」を `|` で表す書き方
- **undefined** — 値が無い状態

<!-- ノート: 結論を先に言い切ります。strict のおかげで確認が強制されると添えます。 -->

---

## 確認しないと使えない

```ts
const port: string | undefined = process.env.PORT;

console.log(port.length);        // エラー: undefined かもしれない

if (port !== undefined) {
  console.log(port.length);      // ここでは string として扱える
}
```

<!-- ノート: if を通ると型が絞られる、という挙動をここで一度だけ見せます。 -->

---

<!-- _class: summary -->

## まとめ

**string | undefined は「文字列か、値が無いか」を表し、使う前の確認を強制する**

<!-- ノート: 結論の再掲だけ。型が確認を強制してくれることが、サーバー側では特に効きます。 -->
