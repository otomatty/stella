# レッスン3-1 演習 — 関数に型を付ける

対象トピック: 3-1-1 〜 3-1-4

## 手元で試す

レッスン1-1で作った環境を使います。

```bash
cd ~/ts-node-practice
cat > src/fn.ts <<'TS'
function withTax(price: number): number {
  return Math.round(price * 1.1);
}

console.log(withTax(1000));
TS

npx tsc --noEmit && npx tsc && node dist/fn.js
```

間違った値を渡して、どこが赤くなるか確かめます。

```bash
cat >> src/fn.ts <<'TS'

withTax("1000");
TS

npx tsc --noEmit      # 追記した行が指摘される
```

**確かめたら元に戻します。** `tsc` は `src/` の全ファイルを検査するので、わざと壊したファイルを残すと、このあとの検査がずっと失敗し続けます。

```bash
cat > src/fn.ts <<'TS'
function withTax(price: number): number {
  return Math.round(price * 1.1);
}

console.log(withTax(1000));
TS

npx tsc --noEmit      # エラーが消える
```

戻り値の型を守っていない実装も試します。

```bash
cat > src/bad.ts <<'TS'
function withTax(price: number): number {
  return "1100";
}
TS

npx tsc --noEmit      # 関数自身の中が指摘される
rm src/bad.ts
```

省略できる引数を書きます。

```bash
cat > src/greet.ts <<'TS'
function greet(name: string, title?: string): string {
  if (title === undefined) {
    return name + " さん";
  }
  return name + " " + title.trim();
}

console.log(greet("佐藤"));
console.log(greet("佐藤", "部長"));
TS

npx tsc --noEmit
```

確認を消すとどうなるかも見てください。`if (title === undefined) {` から閉じ括弧 `}` までの **3 行をまとめて**消して `npx tsc --noEmit` を実行すると、`title.trim()` のところで「`title` は `undefined` の可能性がある」と指摘されます(`if` の行だけを消すと括弧が合わず、別のエラーになります)。

ついでに、消した状態で `.trim()` も外して `return name + " " + title;` にしてみてください。**今度は検査を通ります**。`npx tsc && node dist/greet.js` で実行すると「佐藤 undefined」が出ます。つなぐだけなら型は止めてくれない、というのがここでの発見です。

**確かめたら 3 行を戻す** か、次の 1 行でファイルごと片付けてください。

```bash
rm src/greet.ts
```

## 演習問題

### 問1(基本)

2つの数値を受け取って合計を返す関数 `sum` に、引数と戻り値の型を付けて書いてください。

### 問2(基本)

`withTax("1000")` と呼び出したとき、エラーは関数の中と呼び出し側のどちらで報告されますか。それはなぜ良いことですか。

### 問3(応用)

戻り値の型は推論できるのに、あえて書くのはなぜですか。

### 問4(応用)

引数を `title?: string` と省略可能にしたとき、関数の中で追加で必要になることは何ですか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
function sum(a: number, b: number): number {
  return a + b;
}
```

引数と戻り値は、関数の入口と出口という「他人と接する境界」なので、どちらも型を書きます。

</details>

<details>
<summary>問2の解答例</summary>

呼び出し側の行で報告されます。

間違いの原因は「渡した値」なので、原因の場所でそのまま気づけます。関数の中で報告されると、原因を探して呼び出し元をたどる作業が発生します。

</details>

<details>
<summary>問3の解答例</summary>

実装を変えたときに、約束(返す値の種類)が崩れたことをその関数自身の場所で気づけるためです。

書いていないと、推論された型が静かに変わり、呼び出し側が壊れて初めて気づくことになります。

</details>

<details>
<summary>問4の解答例</summary>

その引数が `undefined` である場合の扱いです。

省略できるということは型が `string | undefined` になるということなので、使う前に確認するか、既定値を用意する必要があります。

</details>

## 確認クイズ

### Q1. `function withTax(price: number)` に `withTax("1000")` と渡すと、エラーはどこで報告されますか。

- A. 関数の中
- B. 呼び出し側の行
- C. 実行時にだけ報告される

<details>
<summary>答え</summary>

**B** — 原因の場所で気づけることが、引数に型を書く価値です。

</details>

### Q2. 関数の引数に必ず型を書く理由はどれですか。

- A. 呼び出し側から何が渡るか分からないため、約束として明示する
- B. 型を書かないと関数が動かないため
- C. 実行速度が上がるため

<details>
<summary>答え</summary>

**A** — 関数の入口は他人と接する境界です。実行速度とは関係ありません。

</details>

### Q3. 戻り値の型を明示する利点はどれですか。

- A. 実装を変えて約束が崩れたときに、その関数の中で気づける
- B. 関数の実行が速くなる
- C. 引数の型を省略できる

<details>
<summary>答え</summary>

**A** — 書いていないと、壊れる場所が呼び出し側まで遠のきます。

</details>

### Q4. `function greet(name: string, title?: string)` の `title` の型は実際には何ですか。

- A. `string`
- B. `string | undefined`
- C. `void`

<details>
<summary>答え</summary>

**B** — 省略できるということは、渡されない可能性があるということです。中では確認が必要になります。

</details>

### Q5. 値を返さない関数の戻り値の型はどれですか。

- A. `undefined`
- B. `void`
- C. `null`

<details>
<summary>答え</summary>

**B** — `void` は「返す値が無い」ことを表し、返し忘れではなく意図的だと示せます。

</details>
