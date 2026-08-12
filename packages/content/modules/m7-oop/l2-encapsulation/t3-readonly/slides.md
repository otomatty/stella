---
id: 7-2-3
title: クラスのreadonly
takeaway: "readonlyを付けたプロパティは、コンストラクタでだけ値を入れられる"
introduces: []
requires: [readonly, クラス, プロパティ, コンストラクタ, private]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 7-2-3
# クラスのreadonly

TypeScript入門研修 — Module 7 / レッスン7-2

<!-- ノート: 3-4-3で型エイリアスに付けたreadonlyが、クラスでも使えます。ただしタイミングに1つ特徴があります。 -->

---

## なぜ必要か

- 商品IDのように、作ったあと絶対に変わらない項目がある
- `private`にすると、クラスの中からは書き換えられてしまう

<!-- ノート: つかみ。privateは「外から触れない」だけで、中からは自由。うっかりメソッドの中で書き換える事故は防げない。 -->

---

## 結論

**`readonly`を付けたプロパティは、コンストラクタでだけ値を入れられる**

- クラスの中からでも、あとからは書き換えられない

<!-- ノート: 結論を先に言い切る。3-4-3のreadonlyと同じキーワードだが、クラスでは「コンストラクタの中だけ例外」というルールが加わる。作るときには決められる、という当然の配慮。 -->

---

## 最小のコード

```ts
class Product {
  readonly id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id; // OK(コンストラクタの中)
    this.name = name;
  }

  rename(newName: string): void {
    this.name = newName; // OK
    this.id = "X-999";
    // エラー: Cannot assign to 'id' because it is a read-only property.
  }
}
```

<!-- ノート: 同じ this.id への代入が、コンストラクタでは通り、メソッドでは弾かれる。1-1-2のconstと同じく「一度決めたら変えない」という約束を型で表現している。 -->

---

## 書き込めるのはコンストラクタの中だけ

![w:950](assets/readonly-timeline.svg)

<!-- ノート: 時間軸で見ると、書き込める窓はコンストラクタの間だけ。privateとreadonlyは目的が違うので、組み合わせて使うこともできる(private readonly)。 -->

---

<!-- _class: summary -->

## まとめ

**`readonly`を付けたプロパティは、コンストラクタでだけ値を入れられる**

<!-- ノート: 結論の再掲だけ。ところでインスタンスを作らずに使いたい処理もある、と引きを作って締める。 -->
