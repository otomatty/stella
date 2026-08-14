# レッスン1-5 リテラル型とユニオン型

## このレッスンの目標

- [ ] リテラル型で「その値だけ」を許す型を書ける
- [ ] ユニオン型で「AまたはB」を表せる
- [ ] `const`と`let`で推論される型の広さが変わる理由を説明できる

## 1-5-1 リテラル型

> **値そのものを型にできる。その値しか代入できなくなる**

業務には「この3つの値しか取らない」項目が山ほどあります。たとえばタスクの状態は「未着手・進行中・完了」だけです。ところが`string`型にすると、どんな文字列でも入れられてしまいます。

この緩さを締めるのが**リテラル型**です。リテラルとは、コードに直接書いた値そのもののこと。その値を、型の位置に書きます。

```ts
let status: "done" = "done";
status = "todo";
// エラー: Type '"todo"' is not assignable to type '"done"'.
```

`"done"`という型には`"done"`しか入りません。型注釈の位置にクォート付きの文字列が書かれている、という見た目に最初は驚くかもしれません。

数値や`true` / `false`もリテラル型にできます。この時点では不便な型に見えますが、次のトピックと組み合わせると真価が出ます。

## 1-5-2 ユニオン型

> **型を「|」でつなぐと「AまたはB」を表せる**

現実のデータは1種類に収まらないことがあります。たとえば会員IDが、旧システムでは数値、新システムでは文字列、というような場合です。

**ユニオン型**は、型を`|`(縦棒。「または」と読みます)でつないで表します。日本語キーボードでは`Shift`+`￥`で入力できます。

```ts
let memberId: number | string = 1001;
memberId = "A-1001"; // OK
memberId = true;
// エラー: Type 'boolean' is not assignable to type 'string | number'.
```

「なんでも入る」わけではありません。つないだ型だけが入ります。3つ以上つなぐこともできます。

## 1-5-3 リテラル型とユニオン型を組み合わせる

> **リテラル型を「|」でつなぐと、決まった値だけを許す型になる**

タスクの状態、注文の状態、会員ランク。選択肢が決まった項目は無数にあります。`string`型のままだと、`"done"`と書くべきところに`"Done"`と書いても通ってしまい、条件分岐が静かに外れます。

```ts
let taskStatus: "todo" | "doing" | "done" = "todo";
taskStatus = "done"; // OK
taskStatus = "完了";
// エラー: Type '"完了"' is not assignable to
// type '"todo" | "doing" | "done"'.
```

業務ルールをそのまま型として書けます。エラーメッセージに許される値がすべて並ぶので、何を書けばよいかがメッセージ自体からわかるのも利点です。

![リテラル型のユニオンが門番として働く図。決まった値だけを通し、それ以外はコンパイルエラーで弾く](t3-literal-union/assets/literal-union.svg)

これは「型で仕様を表現する」という、TypeScriptの最も価値のある使い方の入口です。

## 1-5-4 constは狭く、letは広く推論される

> **constはリテラル型に、letは広い型に推論される**

Playgroundで型を確認すると、`string`ではなく`"premium"`と表示されることがあります。仕組みを知らないとバグかと思って手が止まるので、ここで押さえておきます。

```ts
const plan = "premium";
// planの型は "premium" (リテラル型)

let currentPlan = "premium";
// currentPlanの型は string
```

理由は再代入の可否です。`const`は再代入されないと確定しているので、値そのものを型にできます。`let`は再代入されうるので、同じ種類の値なら受け入れる広い型になります。レッスン1-1で学んだ`const`と`let`の違いが、ここで型の話につながります。

![constとletで推論される型の広さが変わる図。constは値そのもの、letは型全体](t4-const-inference/assets/const-inference.svg)

Playgroundで両方にマウスカーソルを乗せると、型の違いを目で確認できます。

## もっと知りたい人へ

- [リテラル型](https://typescriptbook.jp/reference/values-types-variables/literal-types) — リテラル型の詳しい説明
- [ユニオン型](https://typescriptbook.jp/reference/values-types-variables/union) — ユニオン型の詳しい説明

---

演習は [practice.md](practice.md) にあります。
