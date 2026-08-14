---
id: 7-3-2
title: super
takeaway: "子クラスのコンストラクタでは、最初にsuper()で親を初期化する"
introduces: [super]
requires: [継承, コンストラクタ, 親クラス, 子クラス, this, 引数]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 7-3-2
# super

TypeScript入門研修 — Module 7 / レッスン7-3

<!-- ノート: 子クラスに独自のプロパティを持たせるときのルールです。ここでエラーに出会う人が多いので、理由まで押さえます。 -->

---

## なぜ必要か

- プレミアム会員には「有効期限」を追加したい
- 子でコンストラクタを書くと、親の初期化はどうなるのか

<!-- ノート: つかみ。子でconstructorを書いた瞬間、親のconstructorは自動では動かない。そのまま書くとエラーになる。 -->

---

## 結論

**子クラスのコンストラクタでは、最初に`super()`で親を初期化する**

- `super` = 親クラスを指す特別な名前

<!-- ノート: 結論を先に言い切る。superを定義する。7-1-3のthisが「自分自身」だったのに対し、superは「親」。かっこを付けて呼ぶと、親のコンストラクタが動く。 -->

---

## 最小のコード

```ts
class Member {
  constructor(protected name: string) {}
}

class PremiumMember extends Member {
  constructor(name: string, private expiresAt: string) {
    super(name); // 先に親を初期化する
  }
}

const p = new PremiumMember("田中", "2027-03-31");
```

<!-- ノート: 親に渡すべき値をsuperのかっこに渡す。子独自のexpiresAtはショートハンドで受けている。順番が大事で、super()より前にthisを使うことはできない。 -->

---

## 忘れるとエラーになる

```ts
class PremiumMember extends Member {
  constructor(name: string) {
    this.name = name;
    // エラー: 'super' must be called before accessing 'this'
    // in the constructor of a derived class.
  }
}
```

<!-- ノート: 対比枠。親の初期化が終わるまで、インスタンスは完成していない。だからthisに触れない。「まず親、次に自分」という順序として覚える。 -->

---

<!-- _class: summary -->

## まとめ

**子クラスのコンストラクタでは、最初に`super()`で親を初期化する**

<!-- ノート: 結論の再掲だけ。では親と同じ名前のメソッドを子で書いたらどうなるか、という問いを残して締める。 -->
