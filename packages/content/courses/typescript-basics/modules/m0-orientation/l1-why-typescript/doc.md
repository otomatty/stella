# レッスン0-1 なぜTypeScriptを学ぶのか

## このレッスンの目標

- [ ] JavaScriptで起きる「気づくのが遅いバグ」を説明できる
- [ ] TypeScriptが何を解決する道具かを説明できる
- [ ] TypeScriptがJavaScriptに変換されて動くことを理解している

## 0-1-1 JavaScriptは間違いに気づくのが遅い

> **JavaScriptは、値の種類を間違えても実行するまで気づけない**

まず言葉を3つ決めておきます。

- **プログラム** — コンピューターへの命令を並べたもの
- **値** — そのプログラムが扱うデータ(金額、名前、個数など)
- **バグ** — 意図したとおりに動かない箇所

JavaScriptは、Webページを動かすために作られた言語で、この研修の土台にあたります。とても柔軟な反面、値の種類を取り違えても止めてくれません。

```js
const price = "300"; // 数値のつもりが、文字列だった
const total = price + 50;

console.log(total); // => "30050"
```

期待は`350`ですが、実際は`"30050"`です。しかも**エラーは出ません**。画面を見るまで誰も気づけません。フォームの入力値は文字列で届くため、この取り違えは現場で本当に起きます。

問題はバグそのものより、**気づくのが遅いこと**です。

| 気づくタイミング | 直す手間 |
| --- | --- |
| 書いている最中 | 数秒 |
| 動かしたとき | 数分 |
| 本番で顧客が見つけたとき | 数時間〜 |

## 0-1-2 TypeScriptは間違いを実行前に見つける

> **TypeScriptは、型を書くことで間違いを実行前に見つける**

TypeScriptは、JavaScriptに**型**を書けるようにした言語です。別物ではありません。

- **型** — その値が「どんな種類か」を表す情報
- **コンパイラー** — 型を見て、おかしな箇所を指摘してくれるプログラム

```ts
const price: number = "300";
// エラー: Type 'string' is not assignable to type 'number'.
```

`: number`が「これは数値です」という宣言です。文字列を入れようとした時点で、**実行する前に**エラーになります。書き方の詳細はModule 1で扱うので、ここでは「宣言しておくと守ってくれる」という体験だけ持ち帰ってください。

![実行前にチェックする世界と、実行してから気づく世界の対比図](t2-ts-finds-bugs-early/assets/static-vs-dynamic.svg)

## 0-1-3 TypeScriptはJavaScriptに変換されて動く

> **TypeScriptはJavaScriptに変換されてから動く。型は変換時に消える**

ブラウザやサーバーが理解できるのはJavaScriptだけです。**コンパイル**(書いたコードを動かせる形に変換すること)を通してから実行されます。

```ts
// TypeScript(書くもの)
const price: number = 300;
```

```js
// JavaScript(変換後・実際に動くもの)
const price = 300;
```

違いは型注釈`: number`があるかどうかだけです。**型は変換後のJavaScriptには残りません。**

つまり型は「実行時の防具」ではなく「開発中の相棒」です。ここを誤解したまま進むと、後で混乱するので押さえておいてください。

![TypeScriptがコンパイラーを通ってJavaScriptになり、実行されるまでの流れ図](t3-compile/assets/compile-flow.svg)

## もっと知りたい人へ

- [TypeScriptの特徴](https://typescriptbook.jp/overview/features) — TypeScriptがどんな言語か
- [なぜTypeScriptを使うべきか](https://typescriptbook.jp/overview/why-you-should-use-typescript) — 導入の動機
- [静的型付け](https://typescriptbook.jp/overview/static-type) — 実行前にチェックするという考え方

---

演習は [practice.md](practice.md) にあります。
