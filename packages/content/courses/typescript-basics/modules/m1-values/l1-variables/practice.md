# レッスン1-1 演習 — 変数

対象トピック: 1-1-1 〜 1-1-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const shopName = "青山コーヒー店";
const taxRate = 0.1;
let stockCount = 20;

stockCount = 18;

console.log(shopName); // => "青山コーヒー店"
console.log(taxRate); // => 0.1
console.log(stockCount); // => 18
```

写経できたら、次の改造をしてみましょう。

1. `shopName = "渋谷コーヒー店";`という行を追加して、どんなエラーメッセージが出るか読んでみましょう
2. `let stockCount = 30;`という行を追加して、二度宣言のエラーを確認しましょう
3. `let memo;`のように初期値なしで宣言し、`console.log(memo);`で何が表示されるか見てみましょう

## 演習問題

### 問1(基本)

次の3つの値を、それぞれふさわしいキーワード(`let`または`const`)で変数として宣言してください。宣言したら`console.log`で表示してください。

- 会社名「株式会社サンプル」(今後変わらない)
- 今月の売上目標 500000(今後変わらない)
- 現在の売上 120000(日々更新される)

### 問2(基本)

次のコードはエラーになります。エラーメッセージを予想してからPlaygroundに貼り付け、実際のメッセージと見比べてください。そのうえで、エラーが出ないように直してください。

```ts
const memberCount = 5;
memberCount = 6;
console.log(memberCount);
```

### 問3(応用)

次のコードは`var`で書かれています。`const`と`let`を使って書き直してください。書き直すと、元のコードに潜んでいた問題が1つ表面化します。それが何かも説明してください。

```ts
var storeName = "青山店";
var storeName = "渋谷店";
console.log(storeName);
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const companyName = "株式会社サンプル";
const salesTarget = 500000;
let currentSales = 120000;

console.log(companyName); // => "株式会社サンプル"
console.log(salesTarget); // => 500000
console.log(currentSales); // => 120000
```

変わらない値は`const`、更新される値は`let`で宣言します。迷ったらまず`const`にして、再代入が必要になったときだけ`let`へ変えるのが実務の基本です。

</details>

<details>
<summary>問2の解答例</summary>

```ts
let memberCount = 5;
memberCount = 6;
console.log(memberCount); // => 6
```

元のコードでは「Cannot assign to 'memberCount' because it is a constant.」というエラーが出ます。「定数だから代入できない」という意味です。再代入が必要なので`let`に変更します。

なお、再代入が不要な設計にできるなら、新しい変数を作る方法もあります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const storeName = "青山店";
console.log(storeName); // => "青山店"
```

`var`では同じ名前で二度宣言してもエラーになりません。そのため、元のコードでは1行目の「青山店」が静かに上書きされ、意図せず消えていました。

`const`や`let`に書き直すと「Cannot redeclare block-scoped variable 'storeName'.」というエラーで、二度宣言していることに実行前に気づけます。2つの店舗名を扱いたかったのであれば、別々の名前の変数を用意するのが正解です。

</details>

## 確認クイズ

### Q1. 再代入が必要な変数を宣言するキーワードはどれですか?

- A. `const`
- B. `let`
- C. どちらでもよい

<details>
<summary>答え</summary>

**B** — `let`は再代入できます。`const`は再代入できません。

</details>

### Q2. `const taxRate = 0.1;`のあとに`taxRate = 0.08;`と書くとどうなりますか?

- A. 問題なく0.08に更新される
- B. 「Cannot assign to 'taxRate' because it is a constant.」というエラーになる
- C. 実行はできるが警告が表示される

<details>
<summary>答え</summary>

**B** — `const`で宣言した変数は再代入できません。実行前にコンパイラーがエラーとして検出してくれます。

</details>

### Q3. 変数宣言について、本研修で推奨する方針はどれですか?

- A. まず`const`で宣言し、再代入が必要なときだけ`let`にする
- B. いつでも自由に再代入できるよう、常に`let`で宣言する
- C. 短く書けるので`var`を使う

<details>
<summary>答え</summary>

**A** — `const`を基本にすると、うっかり上書きをコンパイラーが検出してくれます。読み手にとっても「この値は変わらない」という情報になります。

</details>

### Q4. `var`を新しいコードで使わない理由として正しいものはどれですか?

- A. 文字数が多くて打つのが面倒だから
- B. 同じ名前で二度宣言できてしまうなど、事故を招く性質があるから
- C. TypeScriptでは構文エラーになるから

<details>
<summary>答え</summary>

**B** — `var`はTypeScriptでも動きますが、二度宣言を許すなど事故を招く性質があります。読めればよく、書く必要はありません。

</details>
