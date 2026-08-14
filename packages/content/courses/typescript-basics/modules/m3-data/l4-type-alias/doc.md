# レッスン3-4 型エイリアス

## このレッスンの目標

- [ ] `type`で型に名前を付けられる
- [ ] オプショナルプロパティ`?`と`readonly`を使い分けられる
- [ ] 「オブジェクトの配列」を作って処理できる

## 3-4-1 型エイリアス

> **`type`で型に名前を付けると、同じ形を何度でも使い回せる**

`{ name: string; age: number }`を使う場所すべてに書くのは長く、項目が1つ増えたら書いた場所すべてを直すことになります。同じ情報を何か所にも書くのは、レッスン1-2で「推論に任せる」と決めた理由と同じ問題です。

```
type 型の名前 = 型;
```

```ts
type User = {
  name: string;
  age: number;
};

const user: User = { name: "田中", age: 28 };
const member: User = { name: "佐藤", age: 34 };
```

エイリアスは「別名」の意味です。新しい型を作るのではなく、既にある型に呼び名を付けるだけです。型名は大文字始まりにするのが慣習です。

項目を追加したいときは`type`の中に1行足すだけで、使っている全箇所が自動で厳しくなります。足りない場所はエラーで教えてくれます。

![1つの型定義を複数の場所から参照している図](t1-type-alias/assets/type-alias-reuse.svg)

型は「仕様書」でもあるので、名前が付くと読み手にも意図が伝わります。`User`という名前自体が情報になります。

## 3-4-2 オプショナルプロパティ

> **プロパティ名のうしろに`?`を付けると、あってもなくてもよくなる**

会員登録フォームには任意入力の項目があります。必須として書くと、その項目のないデータが作れなくなります。

```ts
type User = {
  name: string;
  phone?: string; // 省略できる
};

const a: User = { name: "田中", phone: "090-0000-0000" }; // OK
const b: User = { name: "佐藤" }; // OK
```

省略できるプロパティを**オプショナルプロパティ**と呼びます。クエスチョンマークは型注釈のコロンの手前に置きます(`phone?: string`の順)。

省略できるということは、読み出したとき`undefined`かもしれないということです。

```ts
const user: User = { name: "佐藤" };

const phone: string = user.phone;
// エラー: Type 'string | undefined' is not
// assignable to type 'string'.
```

型が正直に「ないかもしれない」と言ってくれています。レッスン2-3で学んだ`if`による絞り込みや`??`がそのまま使えます。

```ts
console.log(user.phone ?? "未登録"); // => "未登録"
```

## 3-4-3 readonlyプロパティ

> **プロパティの前に`readonly`を付けると、後から書き換えられなくなる**

レッスン3-2で「`const`でも中身は変えられる」と学びました。ユーザーIDや注文番号のように、作ったあと絶対に変わらない項目を守る仕組みがこれです。

```ts
type User = {
  readonly id: string;
  name: string;
};

const user: User = { id: "U-001", name: "田中" };

user.name = "田中太郎"; // OK
user.id = "U-002";
// エラー: Cannot assign to 'id' because it is
// a read-only property.
```

`readonly`は「読み取り専用」の意味です。プロパティ名の**前**に置きます(オプショナルの`?`は名前の**後ろ**だったので、位置が逆です)。

![「?」は省略可能、「readonly」は書き換え不可であることを整理した図](t3-readonly/assets/optional-readonly.svg)

- `?` — あってもなくてもよい
- `readonly` — あるが変えられない

役割はまったく違います。

## 3-4-4 配列とオブジェクトを組み合わせる

> **実務のデータはほぼ「オブジェクトの配列」の形になる**

商品一覧、注文履歴、検索結果。この形が読めるかどうかが、コードを読める人と読めない人の分かれ目になります。

```
type 型名 = { ... };
const 変数: 型名[] = [ ... ];
```

```ts
type Product = {
  name: string;
  price: number;
};

const products: Product[] = [
  { name: "コーヒー", price: 480 },
  { name: "紅茶", price: 500 },
];
```

レッスン3-1で学んだ「要素の型のうしろに`[]`」というルールが、型エイリアスにもそのまま使えます。新しい構文は1つも出てきません。

角かっこの中に中かっこが並ぶ形に最初は戸惑いますが、**外側が配列、内側が1件ぶんのデータ**と分けて読めば難しくありません。

繰り返しと組み合わせると、実務そのままの形になります。

```ts
let total = 0;

for (const product of products) {
  console.log(`${product.name}: ${product.price}円`);
  total = total + product.price;
}

console.log(total); // => 980
```

`for-of`(3-2-3)、集計(3-2-4)、ドット記法(3-3-2)、テンプレートリテラル(1-4-2)が一度に合流しています。

## もっと知りたい人へ

- [型エイリアス](https://typescriptbook.jp/reference/values-types-variables/type-alias) — 型エイリアスの詳しい説明
- [オプションプロパティ](https://typescriptbook.jp/reference/values-types-variables/object/optional-property) — `?`の詳しい説明
- [readonlyプロパティ](https://typescriptbook.jp/reference/values-types-variables/object/readonly-property) — `readonly`の詳しい説明

---

演習は [practice.md](practice.md) にあります。
