# レッスン6-1 演習 — ジェネリクスの基本

対象トピック: 6-1-1 〜 6-1-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const wrap = <T>(value: T): T[] => [value];

const a = wrap("コーヒー");
const b = wrap(480);

console.log(a); // => ["コーヒー"]
console.log(b); // => [480]
```

写経できたら、次の改造をしてみましょう。

1. `a`と`b`にカーソルを乗せ、推論された型を見比べましょう
2. `wrap<number>("コーヒー")` と書いて、どんなエラーが出るか読みましょう
3. `<T>` を `<Item>` に書き換えても同じように動くことを確認しましょう

## 演習問題

### 問1(基本)

配列を受け取り、最後の要素を返すジェネリック関数`last`を書いてください。文字列の配列でも数値の配列でも使えるようにしてください。

### 問2(基本)

2つの値を受け取り、タプルにして返すジェネリック関数`pair`を書いてください。2つの値は違う型でも構いません。

```ts
console.log(pair("コーヒー", 480)); // 期待: ["コーヒー", 480]
```

### 問3(応用)

`name`プロパティを持つオブジェクトを受け取り、その`name`を表示してから、**受け取ったオブジェクトをそのまま返す**関数`logName`を書いてください。戻り値の型情報が失われないようにしてください。

```ts
const user = logName({ name: "田中", age: 28 });
console.log(user.age); // これが型エラーにならないこと
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const last = <T>(items: T[]): T => items[items.length - 1];

console.log(last(["コーヒー", "紅茶"])); // => "紅茶"
console.log(last([480, 500])); // => 500
```

`T[]`で「なんらかの型の配列」、戻り値は`T`で「その要素の型」を表します。呼び出しごとに`T`が決まるので、戻り値の型も正確になります。

なお、レッスン3-1で学んだとおり、空の配列を渡すと実際には`undefined`が返りますが、型は`T`のままです。

</details>

<details>
<summary>問2の解答例</summary>

```ts
const pair = <A, B>(a: A, b: B): [A, B] => [a, b];

console.log(pair("コーヒー", 480)); // => ["コーヒー", 480]
```

型引数は2つ以上書けます。カンマで区切って山かっこの中に並べます。

戻り値の型は、レッスン5-6で学んだタプルです。`[A, B]`で「1番目がA型、2番目がB型の組」を表します。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const logName = <T extends { name: string }>(value: T): T => {
  console.log(value.name);
  return value;
};

const user = logName({ name: "田中", age: 28 });
console.log(user.age); // => 28
```

ポイントは2つです。

1. `T extends { name: string }` という制約がないと、関数の中で`value.name`が読めません
2. 引数と戻り値を`{ name: string }`にしてしまうと、`age`の情報が失われて`user.age`がエラーになります

**制約を付けつつ、型は`T`のまま返す**のがジェネリクスの真価です。渡した型の情報を保ったまま、中では必要な性質だけを使えます。

</details>

## 確認クイズ

### Q1. ジェネリクスと`any`の違いはどれですか?

- A. どちらも「何でも入る」ので同じ
- B. ジェネリクスは呼び出しごとに型が1つに決まる
- C. `any`のほうが型安全

<details>
<summary>答え</summary>

**B** — `any`は型情報を捨てますが、ジェネリクスは入口の型を出口まで運びます。

</details>

### Q2. `wrap("コーヒー")` のように型を書かずに呼び出せるのはなぜですか?

- A. 型引数が省略できる特別な仕様がある
- B. 渡した値から型引数が推論されるから
- C. `any`になっているから

<details>
<summary>答え</summary>

**B** — レッスン1-2で学んだ型推論が、型引数にも働きます。

</details>

### Q3. `<T>` のままでは`T`の値に対して`.length`が使えないのはなぜですか?

- A. `T`にはどんな型でも入るので、`length`があると保証できないから
- B. `length`は配列にしかないから
- C. 書き方が間違っているから

<details>
<summary>答え</summary>

**A** — `T extends { length: number }`と制約を付けると使えるようになります。

</details>

### Q4. これまでのレッスンで、実はジェネリクスを使っていたのはどれですか?

- A. `console.log`
- B. 配列の`map`
- C. `typeof`

<details>
<summary>答え</summary>

**B** — `map`はジェネリック関数です。だからコールバックの引数の型が分かり、戻り値の配列の型も正確になっていました。

</details>
