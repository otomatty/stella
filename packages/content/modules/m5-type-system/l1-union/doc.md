# レッスン5-1 ユニオン型を深める

## このレッスンの目標

- [ ] ユニオン型の値でできることの範囲を説明できる
- [ ] オブジェクトのユニオンが絞り込みにくい理由を説明できる
- [ ] 判別可能なユニオン型を設計できる

## 5-1-1 ユニオン型は共通部分しか使えない

> **ユニオン型の値は、どちらの型でもできることしか使えない**

ユニオン型を覚えたてで必ずぶつかる壁です。理由が分からないと「型が邪魔をしている」と感じてしまいます。

```ts
const id: string | number = "A-1001";

console.log(id.length);
// エラー: Property 'length' does not exist on
// type 'string | number'.
```

`length`は`string`にはありますが、`number`にはありません。値としては文字列が入っていても、**型の上では`number`の可能性が残っています。**

コンパイラーの立場に立つと当然の話です。どちらが入っているか分からない以上、両方で安全なことしか許せません。

![2つの型が重なった部分だけが使えることを示す集合図](t1-common-only/assets/union-set.svg)

解決策はレッスン2-3で学んだ絞り込みです。

## 5-1-2 オブジェクトのユニオンは絞り込みにくい

> **オブジェクトのユニオンは、`typeof`では区別できない**

実務のユニオン型は、たいていオブジェクト同士です(成功したレスポンスと、失敗したレスポンスなど)。

```ts
type Success = { data: string };
type Failure = { message: string };

const result: Success | Failure = { data: "取得できました" };

console.log(result.data);
// エラー: Property 'data' does not exist on
// type 'Success | Failure'.
```

5-1-1と同じ理由で、`data`は`Success`にしかないので共通部分に含まれません。

ではどう分けるかというと、`typeof`は使えません。レッスン1-6で`typeof null`が`"object"`になる罠を見ましたが、そもそも**オブジェクトはすべて`"object"`を返します。**

共通のプロパティなら読めます。

```ts
type Success = { id: string; data: string };
type Failure = { id: string; message: string };

const result: Success | Failure = { id: "R-1", data: "OK" };

console.log(result.id); // OK(両方にある)
```

ただし`id`を読んでも、どちらの型なのかは分かりません。読めるだけでは足りず、**見分ける手がかり**が要ります。

## 5-1-3 判別可能なユニオン型

> **共通のプロパティにリテラル型の目印を付けると、確実に絞り込める**

推測で見分けるのではなく、最初から名札を付けておく、という発想の転換です。

```ts
type Success = { status: "success"; data: string };
type Failure = { status: "failure"; message: string };

const result: Success | Failure = { status: "success", data: "OK" };

if (result.status === "success") {
  console.log(result.data); // ここではSuccessに確定
}
```

この設計を**判別可能なユニオン型**、目印のプロパティを**ディスクリミネータ**(判別するもの)と呼びます。

仕組みの核心は2つです。

1. `status`は**両方の型にある**ので、絞り込む前でもアクセスできる
2. 値が**リテラル型**なので、比較すればどちらか一方に確定する

レッスン1-5で学んだリテラル型が、ここで決定的な役割を果たします(`status: string`では絞り込めません)。

![目印で分岐すると型が1つに確定することを示す図](t3-discriminated-union/assets/discriminated-union.svg)

`switch`でも同じことができます。レッスン2-4で学んだ「リテラルのユニオン型は`switch`と相性がよい」が、ここで生きてきます。

```ts
switch (result.status) {
  case "success":
    console.log(result.data);
    break;
  case "failure":
    console.log(result.message);
    break;
}
```

## もっと知りたい人へ

- [ユニオン型](https://typescriptbook.jp/reference/values-types-variables/union) — ユニオン型の詳しい説明
- [判別可能なユニオン型](https://typescriptbook.jp/reference/values-types-variables/discriminated-union) — 設計パターンの詳しい説明

---

演習は [practice.md](practice.md) にあります。
