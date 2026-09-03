---
id: 5-1-2
title: unknownは確認してからしか使えない
takeaway: "unknownで受けると、確認を通すまで値を使えないので、確認漏れを防げる"
introduces: [unknown]
requires: [any, JSON, ユニオン型, undefined]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 5-1-2
# unknownは確認してからしか使えない

TypeScript 入門（サーバー） — Module 5 / レッスン5-1

<!-- ノート: any との対比が要点です。どちらも「何でも入る」ですが、出口の厳しさが違います。 -->

---

## なぜ必要か

- `any` にすると、その先の検査が全部効かなくなる
- かといって、外から来た値に確かな型は付けられない

<!-- ノート: つかみ。any は楽ですが、型を書いた意味を消してしまいます。 -->

---

## 結論

**unknownで受けると、確認を通すまで値を使えないので、確認漏れを防げる**

- **unknown** — 何が入っているか分からない値を表す型

<!-- ノート: 結論を先に言い切ります。入口は同じでも、出口で確認を強制するのが unknown です。 -->

---

## anyとunknownの違い

```ts
const a: any = JSON.parse(text);
a.name.length;          // 検査されない。実行時に落ちる

const u: unknown = JSON.parse(text);
u.name;                 // エラー: 確認していない

if (typeof u === "object" && u !== null && "name" in u) {
  // ここでは name があると分かっている
}
```

<!-- ノート: 確認の書き方が長く見えますが、実務ではライブラリに任せることも多いと添えます。 -->

---

<!-- _class: summary -->

## まとめ

**unknownで受けると、確認を通すまで値を使えないので、確認漏れを防げる**

<!-- ノート: 結論の再掲だけ。次は失敗のときに渡ってくる値です。 -->
