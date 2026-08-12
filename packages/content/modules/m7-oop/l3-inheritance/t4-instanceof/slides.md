---
id: 7-3-4
title: instanceof
takeaway: "instanceofは、そのクラスから作られたインスタンスかを判定する型ガード"
introduces: [instanceof]
requires: [継承, インスタンス, 型ガード, 絞り込み, クラス, Error]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 7-3-4
# instanceof

TypeScript入門研修 — Module 7 / レッスン7-3

<!-- ノート: 5-4-3で「instanceofはModule 7で詳しく扱う」と予告した、その回収です。型ガードの4つ目でもあります。 -->

---

## なぜ必要か

- 受け取ったのが通常会員かプレミアム会員か、判定したい場面がある
- 5-4-3では`instanceof Error`を「決まり文句」として使っていた

<!-- ノート: つかみ。あのとき理屈を説明せずに使ってもらった。ここで正体を明かす。5-2で学んだ型ガードの仲間だと位置づける。 -->

---

## 結論

**`instanceof`は、そのクラスから作られたインスタンスかを判定する型ガード**

```
値 instanceof クラス名
```

<!-- ノート: 結論を先に言い切る。5-2-2のtypeofはプリミティブ型、5-2-3のinはプロパティの有無、こちらはクラス。守備範囲が違う3つ目の型ガード。 -->

---

## 最小のコード

```ts
const show = (member: Member): string => {
  if (member instanceof PremiumMember) {
    return member.greet(); // ここでは PremiumMember に確定
  }
  return "通常会員です";
};

console.log(show(new PremiumMember("田中", "2027-03-31")));
```

<!-- ノート: ifの中ではPremiumMemberに絞り込まれ、子クラス独自のメソッドも使える。5-2-1で学んだ制御フロー分析が、ここでも同じように働いている。 -->

---

## 子は親のインスタンスでもある

![w:950](assets/instanceof-sets.svg)

<!-- ノート: プレミアム会員は会員でもあるので、親クラスで判定するとどちらもtrueになる。判定は狭いほう(子)から先に書く。2-2-3で学んだ「範囲の広い条件を先に書くと後ろが届かない」のと同じ構図。 -->

---

<!-- _class: summary -->

## まとめ

**`instanceof`は、そのクラスから作られたインスタンスかを判定する型ガード**

<!-- ノート: 結論の再掲だけ。ところで親クラス自体は実物を作らせたくないことがある、と引きを作って締める。 -->
