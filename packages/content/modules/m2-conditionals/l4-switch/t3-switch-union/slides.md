---
id: 2-4-3
title: switchとリテラルのユニオン型
takeaway: "リテラルのユニオン型をswitchで分けると、候補の書き間違いを実行前に防げる"
introduces: []
requires: [switch, case, リテラル型, ユニオン型, 絞り込み]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 2-4-3
# switchとリテラルのユニオン型

TypeScript入門研修 — Module 2 / レッスン2-4

<!-- ノート: Module 2の最後のトピックです。1-5-3で学んだ型と、いま学んだswitchが合流します。 -->

---

## なぜ必要か

- `case "shiped":` のようなタイポは、`string`のままでは誰も止めてくれない
- その`case`に永遠に入らない、静かなバグになる

<!-- ノート: つかみ。1文字違うだけで動かないが、エラーは出ない。テストで気づければ幸運、気づかなければ本番まで残る。型がここに効く。 -->

---

## 結論

**リテラルのユニオン型を`switch`で分けると、候補の書き間違いを実行前に防げる**

<!-- ノート: 結論を先に言い切る。1-5-3で「業務ルールを型にできる」と学んだが、その型が分岐でも効くという続編。型と制御構造が噛み合う最初の場面。 -->

---

## 最小のコード

```ts
const status: "received" | "shipped" = "shipped";

switch (status) {
  case "received":
    console.log("受付済み");
    break;
  case "shiped": // タイポ
    // エラー: Type '"shiped"' is not comparable to
    // type '"received" | "shipped"'.
    break;
}
```

<!-- ノート: 型に並んでいない値をcaseに書くと、その場でエラーになる。comparableは「比べられる」という意味。存在しない候補と比べても意味がない、とコンパイラーが教えてくれている。 -->

---

## それぞれのcaseの中では型も確定する

```ts
const status: "received" | "shipped" = "shipped";

switch (status) {
  case "shipped":
    const label: "shipped" = status; // OK
    break;
}
```

<!-- ノート: 対比枠。2-3-2で学んだ絞り込みは、ifだけでなくswitchでも働く。caseの中ではその値に確定している。Module 5では、この仕組みを使って分岐の書き漏れまで検出する方法を学ぶと予告する。 -->

---

<!-- _class: summary -->

## まとめ

**リテラルのユニオン型を`switch`で分けると、候補の書き間違いを実行前に防げる**

<!-- ノート: 結論の再掲だけ。Module 2はこれで終了。値と型に加えて流れも作れるようになったので、次はデータのまとまりを扱うと伝えて締める。 -->
