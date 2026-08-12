# レッスン5-5 交差型と構造的型付け

## このレッスンの目標

- [ ] 交差型`&`で型を合成できる
- [ ] TypeScriptが形で型を判定することを説明できる
- [ ] 余剰プロパティチェックが働く条件を説明できる

## 5-5-1 交差型

> **`&`で型をつなぐと、両方の性質をあわせ持つ型になる**

「共通項目 + 個別項目」という形の型は実務に多くあります。同じプロパティを型ごとに書き写すのは、レッスン3-4で型エイリアスを導入したときに嫌ったのと同じ重複です。

```ts
type Base = { id: string; createdAt: string };
type UserInfo = { name: string; age: number };

type User = Base & UserInfo;

const user: User = {
  id: "U-001",
  createdAt: "2026-08-09",
  name: "田中",
  age: 28,
};
```

4つのプロパティすべてが必須になります。1つでも欠けると、3-3-4で見た`missing`エラーになります。

レッスン1-5で学んだユニオン型と対にして覚えてください。

| | 意味 | 求められるもの |
| --- | --- | --- |
| `A \| B` | AまたはB | どちらか一方を満たす |
| `A & B` | AかつB | **両方を満たす** |

記号の見た目が似ているので混同しやすい点に注意してください。プロパティの数で言えば、**交差型は増える方向、ユニオン型は共通部分だけに減る方向**(5-1-1)で、逆になっています。

## 5-5-2 構造的型付け

> **TypeScriptは型の名前ではなく、形が合っているかで判定する**

別の名前の型なのに代入できてしまうことがあります。型名が違えば別物、という直感は他の言語では正しいのですが、TypeScriptでは違います。

```ts
type User = { name: string };
type Product = { name: string };

const user: User = { name: "田中" };
const product: Product = user; // OK(形が同じ)
```

この考え方を**構造的型付け**と呼びます。JavaやC#は名前で判定します(公称型)が、TypeScriptは形さえ合っていれば同じものとみなします。

![名前で判定する世界と形で判定する世界の対比図](t2-structural-typing/assets/nominal-vs-structural.svg)

プロパティが多い分には代入できます(必要なものが揃っているため)。この柔軟さが、**必要最小限の型で受け取る**設計を可能にしています。

一方で、`User`と`Product`のようにまったく意味の違う型でも、形が同じなら相互に代入できてしまいます。意図しない互換性が生まれることがある、という注意点でもあります。

## 5-5-3 余剰プロパティチェック

> **オブジェクトを直接書いて渡すときだけ、余分なプロパティが弾かれる**

同じ内容なのに、変数に入れると通り、直接書くとエラーになります。バグに見えますが、意図した設計です。

```ts
type User = { name: string };

const user: User = { name: "田中", age: 28 };
// エラー: Object literal may only specify known
// properties, and 'age' does not exist in type 'User'.
```

この検査を**余剰プロパティチェック**と呼び、目的は**タイポの検出**です。構造的型付けなら「多い分にはOK」のはずですが、リテラルをその場で直接書いたなら、余分なものはタイポの可能性が高いためです。

変数を経由すると通ります。

```ts
const data = { name: "田中", age: 28 };
const user: User = data; // OK
```

`data`は`User`の形を満たしているので、5-5-2の「形が合えばOK」が適用されます。

**この違いを知らずに「変数に入れれば通る」とだけ覚えると、タイポの検出をすり抜けてしまいます。** 意図的に多く渡す場合を除き、直接書くほうが安全です。

## もっと知りたい人へ

- [インターセクション型](https://typescriptbook.jp/reference/values-types-variables/intersection) — 交差型の詳しい説明
- [構造的型付け](https://typescriptbook.jp/reference/values-types-variables/structural-subtyping) — 構造的型付けと余剰プロパティチェック

---

演習は [practice.md](practice.md) にあります。
