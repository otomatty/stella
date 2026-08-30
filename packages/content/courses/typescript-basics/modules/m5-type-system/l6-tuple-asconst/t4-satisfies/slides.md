---
id: 5-6-4
title: satisfies
takeaway: "satisfiesは型のチェックだけを行い、推論された狭い型を残す"
introduces: [satisfies]
requires: [型注釈, 型推論, as const, 型エイリアス, リテラル型]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 5-6-4
# satisfies

TypeScript入門 — Module 5 / レッスン5-6

<!-- ノート: Module 5の最後のトピックです。型注釈のジレンマを解く、比較的新しい演算子を扱います。 -->

---

## なぜ必要か

- 型注釈を付けると、チェックは効くが**推論された狭い型が失われる**
- 付けないと、狭い型は残るが**チェックが効かない**

<!-- ノート: つかみ。1-2-5で「推論に任せる」と決めたが、チェックもしたい場面がある。この二者択一が長らく解けなかった問題。 -->

---

## 結論

**`satisfies`は型のチェックだけを行い、推論された狭い型を残す**

```
値 satisfies 型
```

<!-- ノート: 結論を先に言い切る。satisfyは「満たす」の意味。「この型を満たしているか確かめて。ただし型はそのままにして」という指示。 -->

---

## 型注釈だと狭い型が失われる

```ts
type Config = { env: string };

const config: Config = { env: "production" } as const;
console.log(config.env);
// 型は string(リテラル型が失われた)
```

<!-- ノート: as const で "production" に固定したのに、Config という型注釈を付けた瞬間 string に戻ってしまう。型注釈は「この型として扱え」という指示なので、より広い型で上書きされる。 -->

---

## satisfiesなら両立する

```ts
const config = { env: "production" } as const satisfies Config;
console.log(config.env);
// 型は "production"(チェックも効いている)
```

<!-- ノート: 対比枠。Configを満たしているかは検査され、型は"production"のまま。envのタイポや型違いはその場でエラーになる。設定オブジェクトを書くときの定番になりつつある。 -->

---

<!-- _class: summary -->

## まとめ

**`satisfies`は型のチェックだけを行い、推論された狭い型を残す**

<!-- ノート: 結論の再掲だけ。Module 5はこれで終了。型の道具はそろったので、次は型そのものを使い回す仕組みに進むと伝えて締める。 -->
