---
id: 7-4-2
title: implements
takeaway: "implementsを書くと、クラスがその約束を守っているかを検査してもらえる"
introduces: [implements]
requires: [インターフェース, クラス, メソッド, プロパティ, 継承]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 7-4-2
# implements

TypeScript入門研修 — Module 7 / レッスン7-4

<!-- ノート: インターフェースをクラスに適用する書き方です。抽象クラスの継承と似ていますが、性質が違います。 -->

---

## なぜ必要か

- 約束を書いても、クラス側が守っているかは自動では確かめられない
- 実装漏れは、使うときになって初めて発覚する

<!-- ノート: つかみ。7-3-5の抽象クラスは実装漏れを検出できた。同じことをインターフェースでもやりたい。 -->

---

## 結論

**`implements`を書くと、クラスがその約束を守っているかを検査してもらえる**

```
class クラス名 implements インターフェース名 { ... }
```

<!-- ノート: 結論を先に言い切る。implementは「実装する」の意味。extendsが「受け継ぐ」なのに対し、implementsは「約束を守ると宣言する」。中身は一切もらえない。 -->

---

## 最小のコード

```ts
interface Shape {
  name: string;
  area(): number;
}

class Circle implements Shape {
  name = "円";
  constructor(private radius: number) {}

  area(): number {
    return 3.14 * this.radius * this.radius;
  }
}
```

<!-- ノート: implementsを書いても、実装は自分で全部書く必要がある。継承と違って何ももらえない。もらえるのは「守れているかの検査」だけ。 -->

---

## 実装漏れはその場でエラー

```ts
class Square implements Shape {
  name = "正方形";
  // エラー: Class 'Square' incorrectly implements interface 'Shape'.
  //   Property 'area' is missing in type 'Square'.
}
```

<!-- ノート: 対比枠。何が足りないかを名指しで教えてくれる。3-3-4で見たmissingエラーと同じ形。カンマで区切れば複数のインターフェースを同時にimplementsできる。 -->

---

<!-- _class: summary -->

## まとめ

**`implements`を書くと、クラスがその約束を守っているかを検査してもらえる**

<!-- ノート: 結論の再掲だけ。ところでimplementsを書かなくても代入できてしまう、という話を次にすると予告して締める。 -->
