# レッスン6-2 演習 — keyofとtypeof

対象トピック: 6-2-1 〜 6-2-4

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、次のコードを写経してください。

```ts
const config = {
  env: "production",
  port: 3000,
};

type Config = typeof config;
type ConfigKey = keyof typeof config;

const get = <K extends keyof Config>(key: K): Config[K] => {
  return config[key];
};

console.log(get("env")); // => "production"
console.log(get("port")); // => 3000
```

写経できたら、次の改造をしてみましょう。

1. `Config`と`ConfigKey`にカーソルを乗せ、展開された型を確認しましょう
2. `get("envv")` と書いて、エラーメッセージに候補が並ぶことを確認しましょう
3. `config`に`debug: true`を足して、`ConfigKey`が自動で増えることを確認しましょう

## 演習問題

### 問1(基本)

次のオブジェクトから、`typeof`型演算子で型`Theme`を作ってください。作った型を使って、別の変数を1つ宣言してください。

```ts
const theme = { color: "blue", size: 14 };
```

### 問2(基本)

問1の`Theme`型から、`keyof`でプロパティ名の型`ThemeKey`を作ってください。その型の変数に、正しい値と誤った値を代入して結果を確認してください。

### 問3(応用)

次の対応表から、キーを受け取って表示名を返す関数`getLabel`を書いてください。存在しないキーは実行前に弾かれるようにしてください。

```ts
const labels = {
  todo: "未着手",
  doing: "進行中",
  done: "完了",
} as const;
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
const theme = { color: "blue", size: 14 };

type Theme = typeof theme;
// { color: string; size: number }

const darkTheme: Theme = { color: "black", size: 16 };
console.log(darkTheme); // => { color: "black", size: 16 }
```

`type`の右に`typeof 変数名`と書きます。値を1回書けば型が付いてくるので、二重管理がなくなります。

</details>

<details>
<summary>問2の解答例</summary>

```ts
type ThemeKey = keyof Theme;
// "color" | "size"

const key1: ThemeKey = "color"; // OK
const key2: ThemeKey = "colour";
// エラー: Type '"colour"' is not assignable to
// type '"color" | "size"'.
```

`keyof`が返すのはリテラルのユニオン型です。エラーメッセージに候補がすべて並ぶので、何を書けばよいかがメッセージから分かります。

</details>

<details>
<summary>問3の解答例</summary>

```ts
const labels = {
  todo: "未着手",
  doing: "進行中",
  done: "完了",
} as const;

type LabelKey = keyof typeof labels;

const getLabel = (key: LabelKey): string => labels[key];

console.log(getLabel("doing")); // => "進行中"

getLabel("dong");
// エラー: Argument of type '"dong"' is not assignable
// to parameter of type '"todo" | "doing" | "done"'.
```

`keyof typeof labels`で、値から直接キーの型を作っています。`labels`に項目を足せば、受け取れるキーも自動で増えます。

戻り値の型を正確にしたいなら、インデックスアクセス型を使います。

```ts
type Labels = typeof labels;

const getLabel = <K extends keyof Labels>(key: K): Labels[K] =>
  labels[key];

const label = getLabel("doing"); // 型は "進行中"
```

`as const`が効いているので、戻り値がリテラル型まで絞られます。

</details>

## 確認クイズ

### Q1. 型の位置で使う`typeof`は何をしますか?

- A. 実行時に型名の文字列を返す
- B. 変数から型を取り出す
- C. 型からプロパティ名を取り出す

<details>
<summary>答え</summary>

**B** — レッスン1-6の`typeof`(値の位置)とは別物です。書いてある場所で見分けます。

</details>

### Q2. `keyof Config` の結果はどんな型ですか?

- A. `string`
- B. プロパティ名のリテラルのユニオン型
- C. `Config`と同じ型

<details>
<summary>答え</summary>

**B** — `"env" | "port"` のような形になります。レッスン1-5で学んだ型そのものです。

</details>

### Q3. `keyof typeof config` はどの順で処理されますか?

- A. 左から右(keyofが先)
- B. 右から左(typeofが先)

<details>
<summary>答え</summary>

**B** — `typeof config`で型を作り、その型に`keyof`が働きます。

</details>

### Q4. `Config[K]` という書き方は何を表しますか?

- A. `Config`型の配列
- B. `K`というキーに対応するプロパティの型
- C. `Config`のK番目の要素

<details>
<summary>答え</summary>

**B** — インデックスアクセス型です。キーごとに戻り値の型を変えられます。

</details>
