# レッスン5-6 タプル・as const・satisfies

## このレッスンの目標

- [ ] タプルで型と個数を固定した配列を書ける
- [ ] `enum`ではなくリテラルのユニオン型を選べる
- [ ] `as const`と`satisfies`を使い分けられる

## 5-6-1 タプル

> **タプルは、要素の型と個数を固定した配列**

「緯度と経度」「名前と年齢」のように、順番と個数が決まった組があります。レッスン3-1で学んだ配列は「同じ型の値がいくつでも」でしたが、ここでは「決まった型が決まった個数」を表したいわけです。

```
[型, 型]
```

```ts
const point: [number, number] = [35.68, 139.76];

console.log(point[0]); // => 35.68

const wrong: [number, number] = [1, 2, 3];
// エラー: Source has 3 element(s) but target allows only 2.
```

`number[]`は「要素の型のうしろに`[]`」でしたが、タプルは**角かっこの中に型そのものを並べます。** 見た目が似ているので区別してください。

型の順番も固定なので、`[35.68, "東京"]`なら`[number, string]`と書きます。

![配列とタプルの違いを示す図](t1-tuple/assets/tuple-vs-array.svg)

取り出すときは、レッスン4-6で学んだ分割代入の配列版が使えます。

```ts
const [lat, lng] = point;
console.log(lat, lng); // => 35.68 139.76
```

位置に意味があるので、取り出すときに名前を付けられると読みやすくなります。ただし順番を覚える必要は残るので、項目が3つ以上ならオブジェクトのほうが読みやすくなります。

## 5-6-2 enumは使わない

> **`enum`は読めればよい。定数の集合はリテラルのユニオン型で書く**

`enum`(イーナム)は名前付きの定数をまとめる機能です。JavaやC#の経験者ほど手が伸びますが、TypeScriptでは推奨されません。レッスン1-1の`var`と同じで「読めるが書かない」スタンスを取ります。

```ts
enum Status {
  Todo = "todo",
  Done = "done",
}
```

問題は、`enum`が**型ではなく実体のある機能**である点です。0-1-3で学んだ「型はコンパイル時に消える」が当てはまらず、変換後のJavaScriptにコードが残ります(Playgroundの「.JS」タブで確認できます)。

代替はレッスン1-5で学んだ書き方そのままです。

```ts
type Status = "todo" | "done";

const status: Status = "todo";
```

**新しく覚えることはゼロで、変換後には何も残りません。** 値と型の対応表が必要なら、オブジェクト + `as const`という手もあります(次のトピック)。

## 5-6-3 as const

> **`as const`を付けると、値がそのままリテラル型に固定される**

レッスン1-5で「`const`は狭く、`let`は広く推論される」と学びました。ところが`const`で宣言しても、**オブジェクトのプロパティは広い型に推論されます**(3-2-2の「中身は変えられる」と同じ理屈です)。

```ts
const config1 = { env: "production" };
// 推論: { env: string }

const config2 = { env: "production" } as const;
// 推論: { readonly env: "production" }
```

`as`は「〜として」の意味です。値の後ろに`as const`と書くだけで、中のプロパティまで再帰的に`readonly`(3-4-3)になります。

使い道の1つが「値から型を作る」ことです。

```ts
const STATUSES = ["todo", "doing", "done"] as const;

type Status = (typeof STATUSES)[number];
// "todo" | "doing" | "done"
```

配列に`as const`を付けると、値からリテラルのユニオン型を作れます。**値と型の二重管理がなくなり、配列に足せば型も自動で増えます。** `typeof`と`[number]`の仕組みはModule 6で扱うので、いまは「こういうことができる」という紹介にとどめます。

## 5-6-4 satisfies

> **`satisfies`は型のチェックだけを行い、推論された狭い型を残す**

型注釈にはジレンマがあります。

- 付けると、チェックは効くが**推論された狭い型が失われる**
- 付けないと、狭い型は残るが**チェックが効かない**

```ts
type Config = { env: string };

const config: Config = { env: "production" } as const;
console.log(config.env);
// 型は string(リテラル型が失われた)
```

`as const`で`"production"`に固定したのに、`Config`という型注釈を付けた瞬間`string`に戻ります。型注釈は「この型として扱え」という指示なので、より広い型で上書きされるためです。

`satisfies`(満たす)を使うと両立します。

```
値 satisfies 型
```

```ts
const config = { env: "production" } as const satisfies Config;
console.log(config.env);
// 型は "production"(チェックも効いている)
```

「この型を満たしているか確かめて。ただし型はそのままにして」という指示です。`env`のタイポや型違いはその場でエラーになります。設定オブジェクトを書くときの定番になりつつあります。

## もっと知りたい人へ

- [タプル](https://typescriptbook.jp/reference/values-types-variables/tuple) — タプルの詳しい説明
- [列挙型(enum)](https://typescriptbook.jp/reference/values-types-variables/enum) — enumの問題点と代替案
- [constアサーション「as const」](https://typescriptbook.jp/reference/values-types-variables/const-assertion) — as constの詳しい説明
- [satisfies演算子](https://typescriptbook.jp/reference/values-types-variables/satisfies) — satisfiesの詳しい説明

---

演習は [practice.md](practice.md) にあります。
