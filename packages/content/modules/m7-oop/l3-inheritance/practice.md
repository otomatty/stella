# レッスン7-3 演習 — 継承

対象トピック: 7-3-1 〜 7-3-5

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
class Member {
  constructor(protected name: string) {}

  greet(): string {
    return `${this.name}さん、こんにちは`;
  }
}

class PremiumMember extends Member {
  constructor(name: string, private expiresAt: string) {
    super(name);
  }

  greet(): string {
    return `${super.greet()} 特典があります(${this.expiresAt}まで)`;
  }
}

const a: Member = new Member("田中");
const b: Member = new PremiumMember("佐藤", "2027-03-31");

console.log(a.greet());
console.log(b.greet());
```

写経できたら、次の改造をしてみましょう。

1. `super(name);` を消して、どんなエラーが出るか読みましょう
2. `protected name` を `private name` に変えて、子クラスから見えなくなることを確認しましょう
3. `b instanceof PremiumMember` と `a instanceof PremiumMember` の結果を比べましょう

## 演習問題

### 問1(基本)

`Animal`クラス(`name`を持ち、`speak()`で「…」を返す)を作り、それを継承した`Dog`クラスで`speak()`をオーバーライドして「ワン」を返すようにしてください。

### 問2(基本)

`Dog`に「犬種」を表す`breed`を追加してください。コンストラクタで`name`と`breed`の両方を受け取り、`super`を正しく呼んでください。

### 問3(応用)

次の抽象クラスを完成させ、`Circle`と`Rectangle`の2つの子クラスを作ってください。そのうえで、配列に入れてまとめて`describe()`を呼んでください。

```ts
abstract class Shape {
  abstract area(): number;

  describe(): string {
    return `面積は${this.area()}です`;
  }
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
class Animal {
  constructor(protected name: string) {}

  speak(): string {
    return `${this.name}: …`;
  }
}

class Dog extends Animal {
  speak(): string {
    return `${this.name}: ワン`;
  }
}

console.log(new Animal("動物").speak()); // => "動物: …"
console.log(new Dog("ポチ").speak()); // => "ポチ: ワン"
```

子クラスで同じ名前のメソッドを書くと、親の実装が上書きされます。`name`を`protected`にしているので、子クラスから`this.name`が読めます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
class Dog extends Animal {
  constructor(name: string, private breed: string) {
    super(name);
  }

  speak(): string {
    return `${this.name}(${this.breed}): ワン`;
  }
}

console.log(new Dog("ポチ", "柴犬").speak());
// => "ポチ(柴犬): ワン"
```

親に渡すべき`name`を`super`のかっこに渡し、子独自の`breed`はコンストラクタショートハンドで受けています。`super()`を先に呼ばないと`this`に触れません。

</details>

<details>
<summary>問3の解答例</summary>

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

class Rectangle extends Shape {
  constructor(private width: number, private height: number) {
    super();
  }
  area(): number {
    return this.width * this.height;
  }
}

const shapes: Shape[] = [new Circle(2), new Rectangle(3, 4)];

for (const shape of shapes) {
  console.log(shape.describe());
}
// => "面積は12.56です"
// => "面積は12です"
```

`Shape[]`という1つの型でまとめて扱えるのに、`describe()`を呼ぶとそれぞれの`area()`が動きます。**共通処理は親に1回だけ書き、違う部分だけを子で実装する**というのが継承の使いどころです。

親のコンストラクタに引数がなくても、`super()`の呼び出しは必要です。

</details>

## 確認クイズ

### Q1. 子クラスのコンストラクタで`this`を使う前に必要なことは何ですか?

- A. `super()`を呼ぶ
- B. プロパティを宣言する
- C. 何も要らない

<details>
<summary>答え</summary>

**A** — 親の初期化が終わるまでインスタンスは完成していないので、`this`に触れません。

</details>

### Q2. `protected`なプロパティが見える範囲はどれですか?

- A. どこからでも
- B. 自分と子クラス
- C. 自分だけ

<details>
<summary>答え</summary>

**B** — `private`だと子クラスから見えません。継承を前提にするなら`protected`にします。

</details>

### Q3. 親と子の両方で判定する`instanceof`を書くとき、先に書くべきなのはどちらですか?

- A. 親クラス
- B. 子クラス

<details>
<summary>答え</summary>

**B** — 子は親でもあるので、親を先に書くと子の分岐に届きません。狭いほうから先に判定します。

</details>

### Q4. 抽象クラスに対して`new`するとどうなりますか?

- A. インスタンスが作られる
- B. 「Cannot create an instance of an abstract class.」というエラーになる
- C. `undefined`が返る

<details>
<summary>答え</summary>

**B** — 抽象クラスは「設計図の設計図」なので、単体では実物を作れません。

</details>
