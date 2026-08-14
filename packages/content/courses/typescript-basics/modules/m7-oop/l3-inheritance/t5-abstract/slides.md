---
id: 7-3-5
title: 抽象クラス
takeaway: "abstractを付けると、newできない代わりに実装を子クラスへ義務づけられる"
introduces: [抽象クラス, abstract]
requires: [継承, メソッド, new, 親クラス, 子クラス, オーバーライド]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 7-3-5
# 抽象クラス

TypeScript入門研修 — Module 7 / レッスン7-3

<!-- ノート: レッスン7-3の最後です。継承を「約束」として使う書き方を1つ覚えます。 -->

---

## なぜ必要か

- 「図形」そのものの実物は存在しない。あるのは円や長方形だけ
- 面積の求め方は図形ごとに違うので、親では書きようがない

<!-- ノート: つかみ。5-1-3の演習で作った図形の型を思い出してもらってもよい。親クラスに中途半端な面積計算を書くと、子で上書きし忘れても気づけない。 -->

---

## 結論

**`abstract`を付けると、`new`できない代わりに実装を子クラスへ義務づけられる**

- 抽象クラス = 設計図の設計図。単体では実物を作れない

<!-- ノート: 結論を先に言い切る。abstractは「抽象的な」の意味。クラスにも、中のメソッドにも付けられる。メソッドに付けると中身を書かず、名前と型だけを宣言する。 -->

---

## 最小のコード

```ts
abstract class Shape {
  abstract area(): number;

  describe(): string {
    return `面積は${this.area()}です`;
  }
}

class Circle extends Shape {
  constructor(private radius: number) {
    super();
  }
  area(): number {
    return 3.14 * this.radius * this.radius;
  }
}

console.log(new Circle(2).describe()); // => "面積は12.56です"
```

<!-- ノート: areaは中身がなく、describeは中身がある。親のdescribeが、子で実装されたareaを呼んでいる点が面白いところ。共通処理は親に、違う部分だけ子に、という分担ができる。 -->

---

## 実装を忘れると、その場でエラー

```ts
class Square extends Shape {}
// エラー: Non-abstract class 'Square' does not implement
// inherited abstract member 'area'.

const shape = new Shape();
// エラー: Cannot create an instance of an abstract class.
```

<!-- ノート: 対比枠。実装漏れも、抽象クラス自体のnewも、実行前に弾かれる。型で約束を表現し、コンパイラーに守らせるという考え方。5-3-4の網羅性チェックと同じ発想。 -->

---

<!-- _class: summary -->

## まとめ

**`abstract`を付けると、`new`できない代わりに実装を子クラスへ義務づけられる**

<!-- ノート: 結論の再掲だけ。レッスン7-3はここまで。実は「約束だけ」を表す、もっと軽い仕組みがあると引きを作って締める。 -->
