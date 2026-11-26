---
sourceRefs: [SRC-typescriptbook-values-types-variables-literal-types]
---
## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. 引数の型が `"縦" | "横"` のとき、渡せない値はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `"縦"`
- B. `"横"`
- C. `"斜め"`

<details>
<summary>解答</summary>

**C** — 候補は縦と横だけです。斜めは、実行前の型の確認でエラーになります。

</details>

### Q2. 型の `|` と条件の `||` の説明で、正しいものはどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. 型の候補は `|` でつなぎ、条件の「または」は `||` で書く
- B. 型の候補も条件の「または」も `||` で書く
- C. `string` と `"縦" | "横"` は同じ範囲の値を受け付ける

<details>
<summary>解答</summary>

**A** — 型をつなぐ縦線は1本です。string は候補以外の文字列も受け付けます。

</details>

### Q3. 戻り値の型が `1 | 2 | 3` のとき、返せる値はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `4`
- B. `2`
- C. `"2"`

<details>
<summary>解答</summary>

**B** — 数の2は候補にあります。4は候補外で、文字列の2も別の値です。

</details>

### Q4. `if` の中で `return` を実行したあと、関数の後ろの行も実行されますか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. 必ず実行される
- B. 次の条件に合うときだけ実行される
- C. その関数は終わり、後ろの行は実行されない

<details>
<summary>解答</summary>

**C** — return は値を返して、その関数を終わらせます。

</details>

### Q5. 次の関数に75を渡したとき、返す値はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// お湯の温度から表示を決める
function waterLabel(temp: number): "熱い" | "適温" | "ぬるい" {
  if (temp >= 90) {
    return "熱い";
  }
  if (temp >= 60) {
    return "適温";
  }
  return "ぬるい";
}
```

- A. `"熱い"`
- B. `"適温"`
- C. `"ぬるい"`

<details>
<summary>解答</summary>

**B** — 最初の条件には合わず、次の条件で適温を返します。最後の行には進みません。

</details>

### Q6. 温度の例で、最後の `return "ぬるい";` に来るのはいつですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. 前の二つの条件に合わなかったとき
- B. 適温を返した直後
- C. どの温度でも必ず来る

<details>
<summary>解答</summary>

**A** — 前の条件に合えば、その中の return で関数は終わります。最後まで来るのは60度未満のときです。

</details>
