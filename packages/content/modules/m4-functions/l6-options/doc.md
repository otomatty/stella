# レッスン4-6 分割代入とOptions Object

## このレッスンの目標

- [ ] 分割代入でオブジェクトからプロパティを取り出せる
- [ ] 引数の位置に分割代入を書ける
- [ ] Options Objectパターンで読みやすい関数を設計できる

## 4-6-1 分割代入

> **オブジェクトから必要なプロパティだけを、同じ名前の変数に取り出せる**

`user.name`、`user.age` と何度も書くと、`user.`が繰り返しになり読むときのノイズになります。使いたいのはプロパティの中身であって、オブジェクト自体ではありません。

```ts
const user = { name: "田中", age: 28 };

const { name, age } = user;

console.log(name); // => "田中"
console.log(age); // => 28
```

この書き方を**分割代入**と呼びます。左辺に中かっこを書くのが特徴で、レッスン3-3のオブジェクトリテラルと形が似ていますが役割は逆です(作るのではなく取り出す)。

プロパティ名と同じ名前の変数が作られます。順番は関係なく、名前で対応します。必要なものだけ書けば構いません。

```ts
const user = { name: "田中", age: 28, email: "a@example.com" };

const { name } = user; // nameだけ取り出す
console.log(name); // => "田中"
```

配列でも同じことができますが(角かっこを使い、順番で対応します)、実務ではオブジェクトの分割代入のほうが圧倒的に多く使われます。

## 4-6-2 分割代入引数

> **引数の位置に分割代入を書くと、受け取ってすぐ中身を使える**

オブジェクトを引数で受け取ると、中で毎回`引数名.`を書くことになります。受け取った直後に分割代入するのも、行が1つ増えて冗長です。

```ts
type User = { name: string; age: number };

const introduce = ({ name, age }: User): string => {
  return `${name}さん(${age}歳)`;
};

console.log(introduce({ name: "田中", age: 28 }));
// => "田中さん(28歳)"
```

引数の位置に中かっこを書き、そのうしろにコロンと型を書きます。**型は分割代入した個々の変数ではなく、オブジェクト全体に対して付けます。** ここでレッスン3-4の型エイリアスが効いてきます。

![呼び出し側はオブジェクトを1つ渡し、受け取り側で個々の変数に展開される図](t2-destructuring-params/assets/destructuring-params.svg)

型注釈をインラインで書くこともできますが長くなるので、型エイリアスで名前を付けるのが実務の基本です。

## 4-6-3 Options Objectパターン

> **引数が3つを超えたら、オブジェクト1つにまとめて名前付きで渡す**

`search("コーヒー", 10, true, false)` は、呼び出し側を見ても意味が分かりません。しかも真偽値が2つ並ぶと、順番を入れ替えても型が同じなので気づけません。

```ts
type SearchOptions = {
  keyword: string;
  limit?: number;
  saleOnly?: boolean;
};

const search = ({ keyword, limit = 10, saleOnly = false }: SearchOptions): string => {
  return `${keyword} / ${limit}件 / セール限定:${saleOnly}`;
};

console.log(search({ keyword: "コーヒー", saleOnly: true }));
// => "コーヒー / 10件 / セール限定:true"
```

この設計を**Options Objectパターン**と呼びます。ここまでの道具がすべて合流しています。

- 4-6-2 の分割代入引数
- 3-4-2 のオプショナルプロパティ(`?`)
- 4-3-2 のデフォルト引数(`= 10`)

![位置引数とOptions Objectの対比図](t3-options-object/assets/positional-vs-options.svg)

Options Objectなら順番が自由で、呼び出し側を読むだけで意味が分かります。

「3つ」という数は目安です。真偽値が2つ以上並んだら早めに切り替える、という判断でも構いません。逆に引数が1つか2つなら位置引数のほうが簡潔なので、使い分けが大事です。

## もっと知りたい人へ

- [分割代入](https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects) — 分割代入の詳しい説明
- [オブジェクトで受け、オブジェクトを返す](https://typescriptbook.jp/tips/adopt-function-style-arguments) — Options Objectの考え方

---

演習は [practice.md](practice.md) にあります。
