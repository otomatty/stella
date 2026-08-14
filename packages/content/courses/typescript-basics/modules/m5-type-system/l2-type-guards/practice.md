# レッスン5-2 演習 — 型ガード

対象トピック: 5-2-1 〜 5-2-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const format = (value: string | number): string => {
  if (typeof value === "string") {
    return `文字列(${value.length}文字)`;
  }
  return `数値(${value * 2})`;
};

console.log(format("コーヒー")); // => "文字列(4文字)"
console.log(format(100)); // => "数値(200)"
```

写経できたら、次の改造をしてみましょう。

1. `if`の中と`return`の行で`value`にカーソルを乗せ、型を見比べましょう
2. `typeof value === "number"` に条件を変えて、両方の枝がどう入れ替わるか確認しましょう
3. `if`を消して`value.length`だけにすると、どんなエラーが出るか読みましょう

## 演習問題

### 問1(基本)

`string | number | undefined` を受け取り、次のように返す関数`describe`を書いてください。

- `undefined` なら「未設定」
- `string` なら その文字列をそのまま
- `number` なら 「〜円」の形

### 問2(基本)

次の2つの型のユニオンを受け取り、`in`で絞り込んで内容を表示する関数を書いてください。

```ts
type Dog = { name: string; bark: string };
type Cat = { name: string; meow: string };
```

### 問3(応用)

問2の判定を、型ガード関数`isDog`として切り出してください。戻り値の型を`boolean`にした場合と`is`を使った場合で、何が違うかも説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const describe = (value: string | number | undefined): string => {
  if (value === undefined) {
    return "未設定";
  }
  if (typeof value === "string") {
    return value;
  }
  return `${value}円`;
};

console.log(describe(undefined)); // => "未設定"
console.log(describe("コーヒー")); // => "コーヒー"
console.log(describe(480)); // => "480円"
```

早期リターンで1つずつ潰していくと、最後の`return`に来る時点で`number`に確定しています。3つの選択肢を2回の判定で分けている点に注目してください。

`undefined`の判定は等価比較、種類の判定は`typeof`と、判定の軸が違うことも確認しておきましょう。

</details>

<details>
<summary>問2の解答例</summary>

```ts
type Dog = { name: string; bark: string };
type Cat = { name: string; meow: string };

const speak = (animal: Dog | Cat): string => {
  if ("bark" in animal) {
    return `${animal.name}: ${animal.bark}`;
  }
  return `${animal.name}: ${animal.meow}`;
};

console.log(speak({ name: "ポチ", bark: "ワン" })); // => "ポチ: ワン"
console.log(speak({ name: "タマ", meow: "ニャー" })); // => "タマ: ニャー"
```

`name`は両方にあるので絞り込む前でも読めます(5-1-2の共通部分の話です)。`bark`と`meow`は片方にしかないので、`in`で分けてから使います。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const isDog = (animal: Dog | Cat): animal is Dog => "bark" in animal;

const speak = (animal: Dog | Cat): string => {
  if (isDog(animal)) {
    return `${animal.name}: ${animal.bark}`;
  }
  return `${animal.name}: ${animal.meow}`;
};
```

戻り値を`boolean`にすると、関数の中では絞り込めていても、呼び出し側では`Dog | Cat`のままです。`animal.bark`を読もうとするとエラーになります。

`animal is Dog`と書くと、「`true`を返したなら`animal`は`Dog`だ」とコンパイラーに伝わり、呼び出し側でも絞り込みが効きます。

ただし、`"bark" in animal`という判定の中身が間違っていてもコンパイラーは信じます。正しさは自分で担保する必要があります。

</details>

## 確認クイズ

### Q1. 同じ変数の型が、コードの位置によって変わることがありますか?

- A. 変わらない。宣言時の型で固定される
- B. 変わる。分岐によって狭まる

<details>
<summary>答え</summary>

**B** — 制御フロー分析によって、その位置での型が決まります。

</details>

### Q2. オブジェクト同士のユニオンを絞り込むのに使えるのはどれですか?

- A. `typeof`
- B. `in`
- C. どちらも使えない

<details>
<summary>答え</summary>

**B** — `typeof`はどちらも`"object"`を返すので使えません。`in`はプロパティの有無で分けられます。

</details>

### Q3. 型ガード関数の戻り値の型を`boolean`にするとどうなりますか?

- A. 呼び出し側でも絞り込みが効く
- B. 呼び出し側では絞り込みが効かない
- C. 構文エラーになる

<details>
<summary>答え</summary>

**B** — `boolean`は「真か偽か」しか表せません。`引数 is 型`と書くことで、型の情報が呼び出し側に伝わります。

</details>

### Q4. 自分で型を設計できるとき、絞り込みの手段としてより安全なのはどれですか?

- A. `in`でプロパティの有無を調べる
- B. 判別可能なユニオン型の目印を使う

<details>
<summary>答え</summary>

**B** — `in`はプロパティ名に暗黙に依存します。目印なら型自身に意図が書かれているので、変更に強くなります。

</details>
