# レッスン7-1 演習 — クラスの基本

対象トピック: 7-1-1 〜 7-1-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
class Product {
  name: string;
  price: number;

  constructor(name: string, price: number) {
    this.name = name;
    this.price = price;
  }

  taxIncluded(): number {
    return Math.round(this.price * 1.1);
  }
}

const coffee = new Product("コーヒー", 480);
const tea = new Product("紅茶", 500);

console.log(coffee.taxIncluded()); // => 528
console.log(tea.taxIncluded()); // => 550
```

写経できたら、次の改造をしてみましょう。

1. `taxIncluded`の中の`this.`を消して、どんなエラーが出るか読みましょう
2. `new`を書かずに`Product("コーヒー", 480)`と呼んで、エラーメッセージを読みましょう
3. 商品名と税込価格を組み立てて返すメソッド`label`を追加してみましょう

## 演習問題

### 問1(基本)

会員を表すクラス`Member`を作ってください。プロパティは`name`(文字列)と`point`(数値)で、コンストラクタで両方を受け取ります。インスタンスを2つ作って表示してください。

### 問2(基本)

問1の`Member`に、会員ランクを返すメソッド`rank`を追加してください。

- 500以上 → 「ゴールド」
- 100以上 → 「シルバー」
- それ未満 → 「一般」

### 問3(応用)

次のコードは期待どおりに動きません。原因を説明し、直してください。

```ts
class Counter {
  count: number;

  constructor(start: number) {
    count = start;
  }

  increment(): number {
    return count + 1;
  }
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
class Member {
  name: string;
  point: number;

  constructor(name: string, point: number) {
    this.name = name;
    this.point = point;
  }
}

const a = new Member("田中", 250);
const b = new Member("佐藤", 800);

console.log(a.name, a.point); // => "田中" 250
console.log(b.name, b.point); // => "佐藤" 800
```

1つのクラスから、独立した値を持つインスタンスをいくつでも作れます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
class Member {
  name: string;
  point: number;

  constructor(name: string, point: number) {
    this.name = name;
    this.point = point;
  }

  rank(): string {
    if (this.point >= 500) {
      return "ゴールド";
    }
    if (this.point >= 100) {
      return "シルバー";
    }
    return "一般";
  }
}

console.log(new Member("田中", 250).rank()); // => "シルバー"
```

メソッドの中では`this.point`で自分のデータを読めるので、引数が要りません。中身はレッスン4-1で学んだ早期リターンそのものです。

</details>

<details>
<summary>問3の解答例</summary>

```ts
class Counter {
  count: number;

  constructor(start: number) {
    this.count = start;
  }

  increment(): number {
    return this.count + 1;
  }
}

const counter = new Counter(5);
console.log(counter.increment()); // => 6
```

原因は`this.`の書き忘れです。

コンストラクタの`count = start;`は、プロパティではなく`count`という名前の変数を探しに行きます。存在しないので「Cannot find name 'count'」というエラーになります。

プロパティにアクセスするときは、必ず`this.`を付けます。同じ名前の引数と区別するためでもあります。

</details>

## 確認クイズ

### Q1. クラスからインスタンスを作るキーワードはどれですか?

- A. `class`
- B. `new`
- C. `constructor`

<details>
<summary>答え</summary>

**B** — `class`は設計図の定義、`constructor`は初期化処理、`new`が実物を作る命令です。

</details>

### Q2. コンストラクタはいつ実行されますか?

- A. クラスを定義したとき
- B. `new`でインスタンスを作るとき
- C. メソッドを呼んだとき

<details>
<summary>答え</summary>

**B** — `new`のかっこに渡した値が、そのままコンストラクタの引数になります。

</details>

### Q3. メソッドの中で自分のプロパティを読むにはどう書きますか?

- A. プロパティ名だけ
- B. `this.プロパティ名`
- C. `クラス名.プロパティ名`

<details>
<summary>答え</summary>

**B** — `this.`を書き忘れると、同名の変数を探しに行ってエラーになります。

</details>

### Q4. これまで使ってきた配列の`push`や`map`は何ですか?

- A. 関数
- B. 配列というオブジェクトが持つメソッド
- C. 型

<details>
<summary>答え</summary>

**B** — ドット記法で呼ぶものはメソッドです。既に使っていた仕組みに、ここで名前が付きました。

</details>
