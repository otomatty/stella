---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
---

## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. 次のコードで表示される値はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 棚のずれ gap に、-4 の絶対値を入れる
const gap = Math.abs(-4);
// ずれの二乗 squared を作る
const squared = gap ** 2;
// 二乗した数の平方根を表示する
console.log(Math.sqrt(squared));
```

- A. `-4`
- B. `4`
- C. `16`

<details>
<summary>解答</summary>

**B** — 絶対値は4、二乗は16です。16の平方根として4が返ります。説明と問題は教材用に独自作成しています。

</details>

### Q2. 次のコードで表示される値はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 希望の席数 requested を作り、0 を入れる
const requested = 0;
// 最低 1 席になるよう、lower に大きい方を入れる
const lower = Math.max(requested, 1);
// 最大 4 席になるよう、seats に小さい方を入れる
const seats = Math.min(lower, 4);
// 席数を表示する
console.log(seats);
```

- A. `0`
- B. `1`
- C. `4`

<details>
<summary>解答</summary>

**B** — まず0と1の大きい方で1になります。次に1と4の小さい方を選ぶので、結果は1です。

</details>

### Q3. 次の関数に false を渡すと、どうなりますか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 予約できるかを受け取り、予約番号を返す関数を作る
function reserve(isAvailable: boolean): number {
  // もし予約できないなら
  if (!isAvailable) {
    // 予約できないことを知らせるエラーを投げる
    throw new Error("予約できません");
  }
  // 予約番号 307 を返す
  return 307;
}
```

- A. `307` を返す
- B. `false` を返す
- C. エラーを投げ、戻り値は返さない

<details>
<summary>解答</summary>

**C** — !false は true です。条件に合うためエラーを投げ、下の return には進みません。

</details>

### Q4. 次のコードでは、amount は 28、failed は false になります。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

```ts
// 金額 amount に、先頭の整数を入れる
const amount = Number.parseInt("28円", 10);
// 読めなかったかを failed に入れる
const failed = Number.isNaN(amount);
```

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 数字の後の「円」で読み取りが止まります。結果は28で NaN ではないため、failed は false です。

</details>

### Q5. 結果が true になる式をすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `Number.isFinite(7.75)`
- B. `Number.isFinite(Infinity)`
- C. `Number.isInteger(7.75)`
- D. `Number.isInteger(3)`
- E. `Number.isNaN(NaN)`

<details>
<summary>解答</summary>

**A, D, E** — 小数も有限の数ですが、整数ではありません。Infinity は有限でなく、NaN の確認には isNaN を使います。

</details>
