# レッスン7-4 演習 — インターフェース

対象トピック: 7-4-1 〜 7-4-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

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

class Rectangle {
  name = "長方形";
  constructor(private w: number, private h: number) {}
  area(): number {
    return this.w * this.h;
  }
}

const shapes: Shape[] = [new Circle(2), new Rectangle(3, 4)];

for (const shape of shapes) {
  console.log(`${shape.name}: ${shape.area()}`);
}
```

写経できたら、次の改造をしてみましょう。

1. `Circle`から`area`を消して、どんなエラーが出るか読みましょう
2. `Rectangle`から`name`を消して、配列に入れる行でエラーが出ることを確認しましょう
3. `interface Shape` を `type Shape` に書き換えても動くことを確認しましょう

## 演習問題

### 問1(基本)

「名前を持ち、あいさつができる」という約束を表すインターフェース`Greetable`を書いてください。プロパティは`name`(文字列)、メソッドは`greet()`(文字列を返す)です。

### 問2(基本)

問1の`Greetable`を`implements`したクラス`Robot`を作ってください。わざと`greet`を書かずに、エラーメッセージを確認してから完成させてください。

### 問3(応用)

次の3つは`interface`では書けません。それぞれ`type`で書いてください。また、なぜ`interface`では書けないのかを説明してください。

- 注文状態(「受付」「発送」「配達完了」のいずれか)
- 価格を受け取って価格を返す関数
- `Base`型と`UserInfo`型の両方を満たす型

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
interface Greetable {
  name: string;
  greet(): string;
}
```

インターフェースには実装を書きません。名前と型だけの「約束」です。`type Greetable = { ... }`と書いてもほぼ同じことができます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
class Robot implements Greetable {
  constructor(public name: string) {}

  greet(): string {
    return `${this.name}です。ピピッ`;
  }
}

console.log(new Robot("R-01").greet()); // => "R-01です。ピピッ"
```

`greet`を書かないと、次のエラーが出ます。

```
Class 'Robot' incorrectly implements interface 'Greetable'.
  Property 'greet' is missing in type 'Robot'.
```

何が足りないかを名指しで教えてくれます。`implements`は「もらう」ためではなく、**実装漏れを早く検出する**ために書きます。

`name`は`public`にしているので、コンストラクタショートハンドでプロパティになり、外からも読めます(インターフェースの約束が`public`を求めているためです)。

</details>

<details>
<summary>問3の解答例</summary>

```ts
type OrderStatus = "received" | "shipped" | "delivered"; // ユニオン型
type PriceRule = (price: number) => number; // 関数型
type User = Base & UserInfo; // 交差型
```

`interface`が書けるのは**オブジェクトの形だけ**だからです。ユニオン型・関数型・交差型はオブジェクトの形ではないため、`interface`では表現できません。

守備範囲が広いのは`type`のほうなので、本研修では`type`を基本にしています。オブジェクトの形だけ`interface`で書き分けると、基準が2つになって迷いが増えます。

</details>

## 確認クイズ

### Q1. インターフェースに書けるものはどれですか?

- A. プロパティとメソッドの「名前と型」だけ
- B. メソッドの中身も書ける
- C. コンストラクタの処理も書ける

<details>
<summary>答え</summary>

**A** — 実装は一切持てません。処理も共有したいなら抽象クラスを使います。

</details>

### Q2. `implements`を書かないクラスは、そのインターフェース型の変数に代入できますか?

- A. できない
- B. 形が合っていればできる

<details>
<summary>答え</summary>

**B** — TypeScriptは形で判定します(構造的型付け)。`implements`は作る側のための検査です。

</details>

### Q3. `interface`では書けないものはどれですか?

- A. オブジェクトの形
- B. ユニオン型
- C. メソッドの型

<details>
<summary>答え</summary>

**B** — ユニオン型・関数型・交差型は`type`でしか書けません。

</details>

### Q4. 本研修で基本とするのはどちらですか?

- A. `type`
- B. `interface`

<details>
<summary>答え</summary>

**A** — 守備範囲が広いので、基本を寄せると迷いません。クラスの約束を書くときだけ`interface`を使います。ただし配属先の規約があればそちらが優先です。

</details>
