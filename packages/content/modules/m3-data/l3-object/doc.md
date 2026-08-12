# レッスン3-3 オブジェクト

## このレッスンの目標

- [ ] オブジェクトを作り、配列との違いを説明できる
- [ ] ドット記法でプロパティを読み書きできる
- [ ] オブジェクトの型注釈を読み書きできる

## 3-3-1 オブジェクトとは

> **オブジェクトは、種類の違う値に名前を付けて1つにまとめたもの**

1人のユーザーは「名前・年齢・メール」がセットで意味を持ちます。配列だと`user[0]`が名前、`user[1]`が年齢…と番号で覚えることになり、順番を入れ替えたら全部壊れます。

- **プロパティ** — 「名前と値」の組
- **オブジェクトリテラル** — 中かっこ`{ }`でプロパティを並べる書き方

```ts
const user = {
  name: "田中",
  age: 28,
};

console.log(user); // => { name: "田中", age: 28 }
```

`名前: 値` をカンマで区切って並べます。コロンの左がプロパティ名、右が値です。最後の要素の後ろにもカンマを付けて構いません(付けておくと行を足しやすくなります)。

中かっこはレッスン2-1のブロックと見た目が同じですが別物です。こちらは値を作る側の中かっこです。

![配列は番号で並び、オブジェクトは名前で並ぶことを示す対比図](t1-object/assets/array-vs-object.svg)

同じ種類の値を並べるなら配列、違う種類をひとまとまりにするならオブジェクトです。

## 3-3-2 ドット記法

> **プロパティはドットに続けて名前を書くと読み書きできる**

ここまで`items.length`や`items.push`を「そういうもの」として使ってきました。実はどちらも、配列というオブジェクトのプロパティです。

```ts
const user = { name: "田中", age: 28 };

console.log(user.name); // => "田中"

user.age = 29; // 書き換え
console.log(user.age); // => 29
```

読むときも書き換えるときも同じ形です。配列は「角かっこと番号」、オブジェクトは「ドットと名前」と対比すると覚えやすくなります。

レッスン3-2で学んだとおり、`const`でもプロパティの書き換えはできます。禁止されているのは変数そのものの差し替えだけです。

打ち間違いは実行前に止まります。

```ts
const user = { name: "田中", age: 28 };

console.log(user.nama);
// エラー: Property 'nama' does not exist on
// type '{ name: string; age: number; }'.
```

JavaScriptなら`undefined`が返るだけでエラーになりません。0-1-1で見た「気づくのが遅いバグ」が、ここでも潰せます。

## 3-3-3 オブジェクトの型注釈

> **オブジェクトの型は、プロパティ名と型の組を中かっこに並べて書く**

エラーメッセージにオブジェクトの型がそのまま出てくるので、読めるようになることが第一目的です。

```
{ プロパティ名: 型; プロパティ名: 型 }
```

```ts
const user: { name: string; age: number } = {
  name: "田中",
  age: 28,
};
```

値を書くオブジェクトリテラルとよく似た形で、違いは**コロンの右が値ではなく型**であることです。区切りはセミコロンでもカンマでも構いませんが、本研修はセミコロンで統一します。

長くなるときは複数行で書きます。

```ts
const product: {
  name: string;
  price: number;
} = { name: "コーヒー", price: 480 };
```

型の部分と値の部分が入れ子になって読みにくいことに気づいたはずです。この読みにくさが、次のレッスンの型エイリアスへの動機になります。

なお、レッスン1-2の方針どおり、初期値があれば推論に任せて構いません。

```ts
const user = { name: "田中", age: 28 };
// 推論: { name: string; age: number }
```

## 3-3-4 型が守ってくれる2つのこと

> **オブジェクトの型は、プロパティ名のタイポと、書き漏らしの両方を止める**

プロパティが10個もあれば、1つ書き忘れることは普通に起きます。人の注意力に頼らない仕組みがここにあります。

**(1) 読むときのタイポ**

```ts
const user: { name: string; age: number } = {
  name: "田中",
  age: 28,
};

console.log(user.nama);
// エラー: Property 'nama' does not exist on type ...
```

**(2) 作るときの書き漏らし**

```ts
const member: { name: string; age: number } = {
  name: "佐藤",
};
// エラー: Property 'age' is missing in type
// '{ name: string; }' but required in type
// '{ name: string; age: number; }'.
```

`missing`は「不足している」、`required`は「必須」です。何が足りないかが名指しで書いてあるので、メッセージどおりに足せば直ります。

![読む側と作る側の両方で型がチェックしていることを示す図](t4-type-protects/assets/type-checks.svg)

この2つが効くだけで、オブジェクトまわりのバグは大きく減ります。

## もっと知りたい人へ

- [オブジェクト](https://typescriptbook.jp/reference/values-types-variables/object) — オブジェクトの詳しい説明
- [オブジェクトの型注釈](https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects) — 型注釈の詳しい書き方

---

演習は [practice.md](practice.md) にあります。
