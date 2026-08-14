# レッスン1-6 nullとundefined

## このレッスンの目標

- [ ] `undefined`と`null`の意味の違いを説明できる
- [ ] `typeof`で値の型を調べられ、`null`の罠を知っている
- [ ] 空になりうる値を`string | undefined`と書ける

## 1-6-1 undefined

> **undefinedは「値がまだ入っていない」ことを表す値**

実務データには「未入力」「未設定」が必ずあります。任意入力の電話番号、まだ発送されていない注文の発送日などです。「値がないのに使ってしまう」のは、JavaScript開発でいちばん有名な実行時エラーの原因です。

`undefined`の特徴は、**自然に発生する**ことです。プログラマーが書かなくても現れます。

```ts
let deliveryDate;
console.log(deliveryDate); // => undefined
```

初期値なしで宣言した変数には、自動で`undefined`が入っています。ほかにも、存在しないプロパティへのアクセスや、値を返さない関数からも生まれますが、それらは後のモジュールで扱います。

## 1-6-2 null

> **nullは「意図的に空である」ことを表す値。自然発生しない**

「まだ入力されていない」と「無いことが確定している」は意味が違います。ミドルネームは、未入力ではなく「無い」ことがあります。この違いをコードで伝えるための値が`null`です。

```ts
const middleName: null = null;
console.log(middleName); // => null
```

型名も値も、同じ`null`と書きます。`undefined`は勝手に生まれるのに対し、`null`は誰かが書いたときだけ現れます。この「自然発生するかどうか」が最大の違いです。

なお、`null`だけの型注釈を実務で書くことはまずありません。1-6-5で学ぶユニオン型との組み合わせで使います。

## 1-6-3 typeofと、nullの罠

> **typeofは型名を文字列で返す。ただしnullだけは`"object"`を返す**

ログに出た値が数値なのか文字列なのか、目で見てもわからないことがあります。`typeof`は値の型名を文字列で返す演算子で、デバッグの友です。

```ts
console.log(typeof 100); // => "number"
console.log(typeof "田中"); // => "string"
console.log(typeof undefined); // => "undefined"
console.log(typeof null); // => "object" ← 罠
```

`null`だけが`"null"`ではなく`"object"`を返します。JavaScript初期からのバグで、互換性のために修正されずに残っています。

実務上の教訓は1つです。**`null`かどうかの判定に`typeof`を使ってはいけません**。

```ts
const value = null;
console.log(typeof value === "object"); // => true (nullでも通ってしまう)
```

`null`の判定は`value === null`と直接比較します(条件分岐で本格的に使うのはModule 2です)。

## 1-6-4 迷ったらundefinedに寄せる

> **「値がない」はundefinedに統一する。nullは受け取るときだけ使う**

意味の違いは微妙で、チームで基準を揃えるのは意外と難しいものです。2種類あると、チェックも2種類書くことになります。

本研修では次の方針を取ります。

- 自分が書く側では`undefined`だけを使う
- 外部のライブラリーが`null`を返す場合は、受け取って扱う

TypeScriptの開発チーム自身も`null`を避ける方針を取っています。ただし、配属先に`null`を使う規約があれば、そちらが最優先です。

![undefinedとnullの対比図。undefinedは自然発生し、nullは意図的に入れた空を表す](t4-undefined-first/assets/undefined-vs-null.svg)

## 1-6-5 空になりうる値の型の書き方

> **空になりうる値は`string | undefined`と書く**

「電話番号は未入力のことがある」を型で伝えたい場面です。`string`と書くと「必ず値がある」という嘘になってしまいます。型は仕様書でもあるので、嘘を書くと後の人が騙されます。

新しい構文は出てきません。1-5-2で学んだユニオン型の、いちばん実用的な使い道です。

```ts
let phoneNumber: string | undefined = undefined;
phoneNumber = "090-0000-0000"; // OK
phoneNumber = 12345;
// エラー: Type 'number' is not assignable to
// type 'string | undefined'.
```

さらに、`tsconfig`の`strict`が有効だと、値があるか確かめずに使うこと自体を止めてくれます(この設定を`strictNullChecks`と呼びます。Playgroundでは既定で有効です)。

```ts
const phone: string | undefined = undefined;
console.log(phone.length);
// エラー: 'phone' is possibly 'undefined'.
```

「値があるか確かめてから使う」書き方はModule 2の条件分岐で学びます。`tsconfig`そのものはModule 9で扱います。

## もっと知りたい人へ

- [undefined型](https://typescriptbook.jp/reference/values-types-variables/undefined) — undefinedの詳しい説明
- [null型](https://typescriptbook.jp/reference/values-types-variables/null) — nullの詳しい説明
- [undefinedとnullの違い](https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null) — 使い分けの議論
- [typeof演算子](https://typescriptbook.jp/reference/values-types-variables/typeof-operator) — typeofの詳しい説明

---

演習は [practice.md](practice.md) にあります。
