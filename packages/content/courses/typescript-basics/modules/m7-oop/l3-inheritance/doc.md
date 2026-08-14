# レッスン7-3 継承

## このレッスンの目標

- [ ] `extends`と`super`で継承を書ける
- [ ] オーバーライドと`instanceof`を使える
- [ ] 抽象クラスで実装を義務づけられる

## 7-3-1 extendsで継承する

> **継承すると、親クラスのプロパティとメソッドを子クラスが受け継ぐ**

「通常会員」と「プレミアム会員」は、共通部分が9割で違いは1割です。クラスを丸ごとコピーすると、共通部分の修正が二重になります。

```
class 子クラス extends 親クラス { ... }
```

```ts
class Member {
  constructor(protected name: string) {}

  greet(): string {
    return `${this.name}さん、こんにちは`;
  }
}

class PremiumMember extends Member {}

const p = new PremiumMember("田中");
console.log(p.greet()); // => "田中さん、こんにちは"
```

子クラスの中は空なのに、親のメソッドが使えています。

**`extends`はレッスン6-1の型引数の制約でも出てきましたが、意味が違います。** あちらは「〜を満たす型に限る」、こちらは「〜を受け継ぐ」です。

`protected`は3つ目のアクセス修飾子で、**自分と子クラスからは見えるが、外からは見えない**という範囲です。`private`だと子から見えないので、継承を前提にするなら`protected`にします。

| 修飾子 | 見える範囲 |
| --- | --- |
| `public`(既定) | どこからでも |
| `protected` | 自分と子クラス |
| `private` | 自分だけ |

![親の持ち物が子に受け継がれる図](t1-extends/assets/inheritance-tree.svg)

**継承は結びつきが強く、親を変えると子すべてに影響します。** まずレッスン5-5の交差型や、後で学ぶインターフェースで足りないかを考えてください。

## 7-3-2 super

> **子クラスのコンストラクタでは、最初に`super()`で親を初期化する**

子で`constructor`を書いた瞬間、親のコンストラクタは自動では動きません。

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

`super`は親クラスを指す特別な名前です。7-1-3の`this`が「自分自身」だったのに対し、`super`は「親」です。

順番が大事で、`super()`より前に`this`を使うことはできません。

```ts
constructor(name: string) {
  this.name = name;
  // エラー: 'super' must be called before accessing 'this'
  // in the constructor of a derived class.
}
```

親の初期化が終わるまで、インスタンスは完成していないためです。**「まず親、次に自分」**と覚えてください。

## 7-3-3 オーバーライド

> **子クラスで同じ名前のメソッドを書くと、親の実装を上書きできる**

`greet`と`greetPremium`に分けると、呼び出す側で分岐が必要になります。同じ名前のまま中身だけ変えられれば、使う側は何も変えなくて済みます。

```ts
class PremiumMember extends Member {
  greet(): string {
    return `${super.greet()} 特典があります`;
  }
}

console.log(new PremiumMember("田中").greet());
// => "田中さん、こんにちは 特典があります"
```

この上書きを**オーバーライド**と呼びます。`super.greet()`で親の実装を呼び出し、その結果に足しています。丸ごと書き換えることも、親を再利用して足すこともできます。

7-3-2の`super()`はコンストラクタ呼び出し、`super.メソッド()`はメソッド呼び出しで、形が違う点に注意してください。

**ハマりどころはメソッド名のタイポです。**

```ts
class PremiumMember extends Member {
  greet2(): string { // 上書きしたつもりが別のメソッド
    return "特典があります";
  }
}
```

名前が違えばオーバーライドにならず、親の実装がそのまま使われます。エラーにならないので気づきにくいところです(`tsconfig`の`noImplicitOverride`で`override`キーワードを必須にできます)。

## 7-3-4 instanceof

> **`instanceof`は、そのクラスから作られたインスタンスかを判定する型ガード**

レッスン5-4で「`instanceof`はModule 7で詳しく扱う」と予告した、その回収です。

```
値 instanceof クラス名
```

```ts
const show = (member: Member): string => {
  if (member instanceof PremiumMember) {
    return member.greet(); // ここでは PremiumMember に確定
  }
  return "通常会員です";
};
```

レッスン5-2で学んだ型ガードの仲間です。守備範囲がそれぞれ違います。

| 型ガード | 判定できるもの |
| --- | --- |
| `typeof` | プリミティブ型 |
| `in` | プロパティの有無 |
| `instanceof` | **クラスのインスタンス** |

![親クラスの集合の中に子クラスが含まれることを示す図](t4-instanceof/assets/instanceof-sets.svg)

プレミアム会員は会員でもあるので、親クラスで判定するとどちらも`true`になります。**判定は狭いほう(子)から先に書きます。** レッスン2-2で学んだ「範囲の広い条件を先に書くと後ろが届かない」のと同じ構図です。

## 7-3-5 抽象クラス

> **`abstract`を付けると、`new`できない代わりに実装を子クラスへ義務づけられる**

「図形」そのものの実物は存在せず、あるのは円や長方形だけです。面積の求め方は図形ごとに違うので、親では書きようがありません。

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

**抽象クラス**は「設計図の設計図」で、単体では実物を作れません。`abstract`はクラスにも中のメソッドにも付けられ、メソッドに付けると中身を書かず名前と型だけを宣言します。

親の`describe`が、子で実装された`area`を呼んでいる点が面白いところです。**共通処理は親に、違う部分だけ子に**という分担ができます。

```ts
class Square extends Shape {}
// エラー: Non-abstract class 'Square' does not implement
// inherited abstract member 'area'.

const shape = new Shape();
// エラー: Cannot create an instance of an abstract class.
```

実装漏れも、抽象クラス自体の`new`も、実行前に弾かれます。型で約束を表現し、コンパイラーに守らせるという考え方で、レッスン5-3の網羅性チェックと同じ発想です。

## もっと知りたい人へ

- [クラスの継承](https://typescriptbook.jp/reference/object-oriented/class/class-inheritance) — 継承の詳しい説明
- [抽象クラス](https://typescriptbook.jp/reference/object-oriented/class/abstract-class) — abstractの詳しい説明

---

演習は [practice.md](practice.md) にあります。
