---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-inference]
---

## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. 次の変数の型として正しいものを選んでください。
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 店名を入れ直せる変数として作る
let shopName = "南店";
```

- A. `"南店"`
- B. `string`
- C. `number`

<details>
<summary>解答</summary>

**B** — let なので、別の文字列にも入れ直せる string と推論されます。

</details>

### Q2. 次の関数の戻り値の型はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 重さを受け取り、配送の区分を返す関数を作る
function deliveryClass(weight: number) {
  // もし2より小さいなら
  if (weight < 2) {
    // 軽量という文字を返す
    return "軽量";
    // 条件の中身はここまで
  }
  // 通常という文字を返す
  return "通常";
  // 関数の中身はここまで
}
```

- A. `number`
- B. `"軽量" | "通常"`
- C. `boolean`

<details>
<summary>解答</summary>

**B** — 二つの return で返す文字列を、縦棒でつないだ型に推論されます。

</details>

### Q3. `"B-204"[0]` は `"B"`、`""[0]` は `undefined` です。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 番号は 0 からです。空の文字列には 0 番目の文字がありません。

</details>

### Q4. 次の説明で正しいものをすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `export const LIMIT = 12` の LIMIT の型は `12`
- B. `export const IS_OPEN = false` の値は文字列である
- C. `(25).toFixed(1)` は `"25.0"`
- D. `else if` は、前の条件に合わなかったときに確かめる

<details>
<summary>解答</summary>

**A, C, D** — const は値そのものの型です。false は引用符がない真偽値です。toFixed の結果は文字列です。

</details>

### Q5. 次の呼び出しの結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 重さから配送のサイズを決める関数を作る
function parcelSize(weight: number) {
  // サイズを入れ直せる変数として作る
  let size = "大";
  // もし2より小さいなら
  if (weight < 2) {
    // 小に入れ直す
    size = "小";
    // そうでなく、もし5より小さいなら
  } else if (weight < 5) {
    // 中に入れ直す
    size = "中";
    // 条件の中身はここまで
  }
  // サイズを返す
  return size;
  // 関数の中身はここまで
}
// 重さ1で呼び出す
parcelSize(1);
```

- A. `"小"`
- B. `"中"`
- C. `"大"`

<details>
<summary>解答</summary>

**A** — 最初の条件に合うので小です。続く else if の条件は確かめません。

</details>
