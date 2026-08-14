---
id: 7-4-3
title: インターフェースを型として使う
takeaway: "形が合っていれば、implementsを書かなくてもその型として扱える"
introduces: []
requires: [インターフェース, 構造的型付け, 型注釈, クラス, implements, 配列]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 7-4-3
# インターフェースを型として使う

TypeScript入門研修 — Module 7 / レッスン7-4

<!-- ノート: インターフェースの本当の使いどころです。5-5-2で学んだ構造的型付けと合流します。 -->

---

## なぜ必要か

- 円も長方形もまとめて扱いたい
- 継承関係がなくても、同じように扱えると便利

<!-- ノート: つかみ。7-3の継承だと親子関係が必要だった。インターフェースなら、無関係なクラス同士でも「同じ形」というだけでまとめられる。 -->

---

## 結論

**形が合っていれば、`implements`を書かなくてもその型として扱える**

- 5-5-2で学んだ構造的型付けがそのまま働く

<!-- ノート: 結論を先に言い切る。TypeScriptは名前ではなく形で判定する。だからimplementsは「必須の宣言」ではなく「検査のお願い」にすぎない。 -->

---

## 最小のコード

```ts
interface Shape {
  name: string;
  area(): number;
}

// implements を書いていない
class Rectangle {
  name = "長方形";
  constructor(private w: number, private h: number) {}
  area(): number {
    return this.w * this.h;
  }
}

const shapes: Shape[] = [new Rectangle(3, 4)]; // OK
```

<!-- ノート: implementsがなくても、形が合っているのでShape[]に入れられる。JavaやC#の経験者ほど驚くところ。5-5-2の「名前ではなく形」がここでも一貫している。 -->

---

## 形が合えばimplementsなしでも代入できる

![w:950](assets/structural-typing.svg)

<!-- ノート: では implements は何のためか。答えは「クラス側で実装漏れを早く検出するため」。書かなくても動くが、書いておくとクラスを直したときにその場でエラーが出る。使う側ではなく、作る側のための安全装置。 -->

---

<!-- _class: summary -->

## まとめ

**形が合っていれば、`implements`を書かなくてもその型として扱える**

<!-- ノート: 結論の再掲だけ。ここまで来ると型エイリアスとの違いが気になる、と引きを作って締める。 -->
