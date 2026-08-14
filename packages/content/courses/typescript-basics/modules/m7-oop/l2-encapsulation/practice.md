# レッスン7-2 演習 — カプセル化

対象トピック: 7-2-1 〜 7-2-5

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
class Stock {
  constructor(private count: number = 0) {}

  get current(): number {
    return this.count;
  }

  add(n: number): void {
    if (n <= 0) {
      return;
    }
    this.count = this.count + n;
  }
}

const stock = new Stock();
stock.add(5);
stock.add(-100); // 無視される
console.log(stock.current); // => 5
```

写経できたら、次の改造をしてみましょう。

1. `stock.count = 999;` と書いて、エラーメッセージを読みましょう
2. `stock.current = 10;` と書いて、getterが読み取り専用であることを確認しましょう
3. `private` を消して、外から自由に書き換えられてしまうことを確認しましょう

## 演習問題

### 問1(基本)

銀行口座を表すクラス`Account`を作ってください。

- 残高は`private`で外から触れないようにする
- `deposit(amount)`で入金できる(0以下は無視)
- getterの`balance`で残高を読める

### 問2(基本)

問1の`Account`に、口座番号`id`を追加してください。作ったあと変更できないようにし、コンストラクタショートハンドで書いてください。

### 問3(応用)

次のクラスには、カプセル化の観点で2つの問題があります。指摘して直してください。

```ts
class Cart {
  items: number[] = [];
  total: number = 0;

  add(price: number): void {
    this.items.push(price);
    this.total = this.total + price;
  }
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
class Account {
  private amount = 0;

  get balance(): number {
    return this.amount;
  }

  deposit(value: number): void {
    if (value <= 0) {
      return;
    }
    this.amount = this.amount + value;
  }
}

const account = new Account();
account.deposit(1000);
account.deposit(-500); // 無視される
console.log(account.balance); // => 1000
```

`private`で隠し、変更は`deposit`という1つの窓口だけに絞っています。不正な値の検査を窓口に書けるので、**残高がマイナスになる状態を作れません。**

getterのおかげで、読むときは`account.balance`とプロパティのように書けます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
class Account {
  private amount = 0;

  constructor(private readonly id: string) {}

  get balance(): number {
    return this.amount;
  }

  get accountId(): string {
    return this.id;
  }

  deposit(value: number): void {
    if (value <= 0) {
      return;
    }
    this.amount = this.amount + value;
  }
}

const account = new Account("A-001");
console.log(account.accountId); // => "A-001"
```

`private readonly id: string` と引数に書くだけで、宣言も代入も不要になります。`readonly`なので、コンストラクタ以外では書き換えられません。

</details>

<details>
<summary>問3の解答例</summary>

問題は2つです。

1. **`items`が公開されている** — 外から`cart.items.push(999)`ができてしまい、`total`と食い違います
2. **`total`を保持している** — `items`と二重管理になり、更新漏れで必ず食い違います

```ts
class Cart {
  private items: number[] = [];

  get total(): number {
    let sum = 0;
    for (const price of this.items) {
      sum = sum + price;
    }
    return sum;
  }

  add(price: number): void {
    this.items.push(price);
  }
}

const cart = new Cart();
cart.add(480);
cart.add(500);
console.log(cart.total); // => 980
```

`items`を`private`にして窓口を`add`だけにし、`total`はgetterで**読まれるたびに計算**します。保持しないので食い違いようがありません。

なお、レッスン3-2で学んだとおり`private`でも配列の中身は変えられますが、外から`items`自体に触れないので問題ありません。

</details>

## 確認クイズ

### Q1. アクセス修飾子を何も書かないとどうなりますか?

- A. `private`になる
- B. `public`(公開)になる
- C. エラーになる

<details>
<summary>答え</summary>

**B** — 既定は`public`です。隠したいものには明示的に`private`を書きます。

</details>

### Q2. getterで定義した`current`を呼び出すときの書き方はどれですか?

- A. `stock.current`
- B. `stock.current()`
- C. `stock.getCurrent()`

<details>
<summary>答え</summary>

**A** — 定義はメソッドの形ですが、使う側はプロパティのように書きます。かっこは付けません。

</details>

### Q3. クラスの`readonly`プロパティに値を入れられるのはどこですか?

- A. どこでも
- B. コンストラクタの中だけ
- C. どこでも入れられない

<details>
<summary>答え</summary>

**B** — 作るときには決められますが、あとからは書き換えられません。

</details>

### Q4. `static`を付けたメソッドの呼び出し方はどれですか?

- A. `new Tax().calc(1000)`
- B. `Tax.calc(1000)`
- C. `calc(1000)`

<details>
<summary>答え</summary>

**B** — インスタンスを作らず、クラス名から直接呼びます。`Math.round`と同じ仕組みです。

</details>

### Q5. コンストラクタショートハンドで修飾子を書き忘れるとどうなりますか?

- A. エラーになる
- B. ただの引数になり、プロパティが作られない
- C. `public`なプロパティになる

<details>
<summary>答え</summary>

**B** — 修飾子を書くことが「これはプロパティです」という宣言も兼ねています。書き忘れると、コンストラクタの中でしか使えないただの引数になります。

</details>
