---
id: 5-2-4
title: 型ガード関数
takeaway: "戻り値の型を「引数 is 型」と書くと、判定を関数に切り出せる"
introduces: [型ガード関数]
requires: [型ガード, 関数, boolean, 戻り値, 型注釈, in, ユニオン型]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 5-2-4
# 型ガード関数

TypeScript入門研修 — Module 5 / レッスン5-2

<!-- ノート: レッスン5-2の最後です。判定を関数にまとめたいときの書き方を1つ覚えます。 -->

---

## なぜ必要か

- 同じ判定を何か所にも書くと、条件を直すとき全部直すことになる
- 関数に切り出すと、絞り込みが効かなくなってしまう

<!-- ノート: つかみ。Module 4で学んだとおり、繰り返す処理は関数にする。ところが型ガードだけは、素直に切り出すと動かない。その理由と解決策。 -->

---

## 結論

**戻り値の型を`引数 is 型`と書くと、判定を関数に切り出せる**

- この関数を型ガード関数と呼ぶ

<!-- ノート: 結論を先に言い切る。booleanと書くのではなく「引数名 is 型名」と書く。これは「trueを返したなら、その引数はこの型だ」とコンパイラーに教える宣言。 -->

---

## booleanだと絞り込めない

```ts
type Success = { data: string };
type Failure = { message: string };

const isSuccess = (r: Success | Failure): boolean => "data" in r;

const result: Success | Failure = { data: "OK" };
if (isSuccess(result)) {
  console.log(result.data);
  // エラー: Property 'data' does not exist ...
}
```

<!-- ノート: 関数の中では絞り込めているのに、呼び出し側には伝わらない。booleanは「真か偽か」しか表さず、「だから型はこれだ」という情報を持てないため。 -->

---

## `is` で書くと伝わる

```ts
const isSuccess = (r: Success | Failure): r is Success =>
  "data" in r;

if (isSuccess(result)) {
  console.log(result.data); // OK
}
```

<!-- ノート: 対比枠。booleanを r is Success に変えただけで通る。ただし判定の中身が間違っていてもコンパイラーは信じてしまうので、中身の正しさは自分で担保する必要があると必ず添える。 -->

---

<!-- _class: summary -->

## まとめ

**戻り値の型を`引数 is 型`と書くと、判定を関数に切り出せる**

<!-- ノート: 結論の再掲だけ。レッスン5-2はここまで。次は型が分からないときにどうするかを扱うと予告して締める。 -->
