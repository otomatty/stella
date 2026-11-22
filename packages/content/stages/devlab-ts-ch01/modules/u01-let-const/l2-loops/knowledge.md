---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-statements-for-of, SRC-typescriptbook-statements-if-else, SRC-typescriptbook-values-types-variables-string]
---

## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. 次のコードで saving に入る値はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 積立額 saving を入れ直せる変数として作り、0 を入れる
let saving = 0;
// i を 1 から 2 まで 1 ずつ増やしながらくり返す
for (let i = 1; i <= 2; i++) {
  // saving に 300 を足す
  saving += 300;
  // くり返す中身はここまで
}
```

- A. `300`
- B. `600`
- C. `900`

<details>
<summary>解答</summary>

**B** — i が 1 と 2 の二回、300 を足します。saving は入れ直すので let です。

</details>

### Q2. 次のくり返しで、表示される i の順番はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// i を 3 から 1 まで 1 ずつ減らしながらくり返す
for (let i = 3; i >= 1; i--) {
  // 発送便の番号を表示する
  console.log(i);
  // くり返す中身はここまで
}
```

- A. `3、2、1`
- B. `3、2、1、0`
- C. `1、2、3`

<details>
<summary>解答</summary>

**A** — >= は同じ値を含むので 1 の回も実行します。0 になると条件が false になり、終了します。

</details>

### Q3. 次のコードで points は 10 のままですか？
<!-- kind: boolean; skills: devlab-ts-ch01 -->

```ts
// 回数 n を作り、0 を入れる
const n = 0;
// ポイント points を入れ直せる変数として作り、10 を入れる
let points = 10;
// i を 0 から n の手前まで 1 ずつ増やしながらくり返す
for (let i = 0; i < n; i++) {
  // points に 2 を掛ける
  points *= 2;
  // くり返す中身はここまで
}
```

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 最初の 0 < 0 が false なので、中身を一回も実行しません。最初に入れた 10 が残ります。

</details>

### Q4. 次のコードで spaced に入る文字列はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 表示 spaced を入れ直せる変数として作り、空の文字列を入れる
let spaced = "";
// 注文番号 CD から 1 文字ずつ c に取り出してくり返す
for (const c of "CD") {
  // spaced の後ろに c と空白をつなげる
  spaced += `${c} `;
  // くり返す中身はここまで
}
```

- A. `"CD"`
- B. `"D C "`
- C. `"C D "`

<details>
<summary>解答</summary>

**C** — C、D の順に文字と空白を足します。最後にも空白が残ります。c は一周ごとに新しく作るので const で書けます。

</details>

### Q5. 次のコードについて、正しいものをすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

```ts
// 商品名 item を作り、ノートを入れる
const item = "ノート";
// 接頭辞 prefix を作り、新を入れる
const prefix = "新";
// 表示 label を入れ直せる変数として作り、item を入れる
let label = item;
// もし商品名がノートと等しいなら
if (item === "ノート") {
  // prefix の後ろに label をつなげ、label に入れ直す
  label = prefix + label;
  // 条件に合うときの中身はここまで
}
```

- A. `item === "ノート"` は `true` になる
- B. `label` は `"ノート新"` になる
- C. `label` は `"新ノート"` になる
- D. 等しいかを比べるときも、`=` を一つ書く

<details>
<summary>解答</summary>

**A, C** — 条件が true なので中身を実行します。文字列の + は左から順につなげます。= は入れ直しで、等しいかの比較は === です。

</details>

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)・[if-else文](https://typescriptbook.jp/reference/statements/if-else)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)。問題と解説は教材用に独自作成しています。
