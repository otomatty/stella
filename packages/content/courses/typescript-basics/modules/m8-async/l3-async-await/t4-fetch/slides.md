---
id: 8-3-4
title: fetchでAPIを呼ぶ
takeaway: "fetchで取得したデータは型が保証されないので、自分で型を決めて扱う"
introduces: [fetch]
requires: [await, async, 型エイリアス, unknown, try, catch, Promise]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 8-3-4
# fetchでAPIを呼ぶ

TypeScript入門研修 — Module 8 / レッスン8-3

<!-- ノート: Module 8の最後のトピックです。ここまでの道具をすべて使って、実務そのままのコードを書きます。 -->

---

## なぜ必要か

- Webアプリの非同期処理の大半は、APIからのデータ取得
- 外部から届くデータは、型が保証されない

<!-- ノート: つかみ。5-3-2でunknownを学んだとき「外部から届くデータは形が分からない」と話した。その現場がここ。 -->

---

## 結論

**`fetch`で取得したデータは型が保証されないので、自分で型を決めて扱う**

- `fetch(URL)` で通信し、`Promise`が返る

<!-- ノート: 結論を先に言い切る。fetchは通信のための組み込み命令。返るのがPromiseなので、awaitで受けられる。ここでいちばん大事なのは後半の注意。 -->

---

## 最小のコード

```ts
type User = { id: number; name: string };

const getUser = async (id: number): Promise<User> => {
  const response = await fetch(`https://example.com/users/${id}`);
  const data = await response.json();
  return data as User; // 形は自分で決めている
};
```

- `await`が2回。通信の完了と、本文の解析で1回ずつ

<!-- ノート: 3-4-1の型エイリアス、1-4-2のテンプレートリテラル、8-3-2のawaitが合流している。response.json()もPromiseを返すので、もう一度awaitが要る点がハマりどころ。 -->

---

## `as User` は「型の言い張り」

- 実際にその形かは**検査されていない**
- 本番では、届いたデータを検査するライブラリーを使う

<!-- ノート: 対比枠。5-3-2で「分からないならunknown」と学んだのに、ここではasで断定している。教材として都合の悪い話を隠さない。実務ではzodなどの検査ライブラリーを使うのが定石だと名前だけ伝える。 -->

---

<!-- _class: summary -->

## まとめ

**`fetch`で取得したデータは型が保証されないので、自分で型を決めて扱う**

<!-- ノート: 結論の再掲だけ。Module 8はこれで終了。言語の学習はここまでで、次は開発環境と道具の話に進むと伝えて締める。 -->
