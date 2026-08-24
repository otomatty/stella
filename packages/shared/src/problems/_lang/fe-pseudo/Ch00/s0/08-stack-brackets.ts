import type { Assignment } from "../../../../../types.js";

/**
 * スタックの課題 (#133)。
 * 括弧が 2 種類あるため、個数を数えるだけでは解けず、必ず後入れ先出しが要る。
 * 作業用配列を引数で受け取るのは、科目B の出題でよく使われる形。
 */
export const s0FePseudoCh00StackBrackets: Assignment = {
  id: "S0-FePseudo-Ch00-08-stack-brackets",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 108,
  title: "擬似言語: スタックで括弧の対応を調べる",
  newConcept: "配列と「頂上の位置」でスタックを表し、後入れ先出しで取り出す",
  estimatedMinutes: 20,
  difficulty: 3,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["対応している"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* 記号の並びの括弧が正しく対応しているかを調べてください。
     1 = 開き丸括弧 (    -1 = 閉じ丸括弧 )
     2 = 開き角括弧 [    -2 = 閉じ角括弧 ]
   stack は作業用の配列です (中身は自由に書き換えて構いません)。 */
○論理型: 対応している(整数型の配列: 記号, 整数型の配列: stack)
  /* ここに処理を書く */
  return false
`,
    },
  ],
  description: `## やること

\`対応している(記号, stack)\` を完成させてください。

括弧は 2 種類あり、数値で表されています。

| 数値 | 意味 |
| --- | --- |
| \`1\` | 開き丸括弧 \`(\` |
| \`-1\` | 閉じ丸括弧 \`)\` |
| \`2\` | 開き角括弧 \`[\` |
| \`-2\` | 閉じ角括弧 \`]\` |

正しく対応していれば \`true\`、していなければ \`false\` を返します。

\`\`\`text
{1, 2, -2, -1}   → ( [ ] )   → true
{1, 2, -1, -2}   → ( [ ) ]   → false   (交差している)
{-1}             → )         → false   (開きが無い)
{1}              → (         → false   (閉じていない)
\`\`\`

## スタックの表し方

擬似言語には「スタック型」はありません。**配列と「頂上の位置」を表す変数**で表します。

\`\`\`text
整数型: top ← 0        ← 0 は「空」を意味する

top ← top + 1          ← push
stack[top] ← 値

値 ← stack[top]        ← pop (先に取り出してから)
top ← top - 1
\`\`\`

\`top\` は 1 から数える位置なので、\`top\` が \`0\` のときスタックは空です。

> 括弧が 1 種類なら個数を数えるだけで足りますが、2 種類あると**最後に開いたものから閉じる**必要があるため、
> スタックが要ります。
`,
  tests: [
    { name: "入れ子", code: "対応している([1, 2, -2, -1], [0, 0, 0, 0]) === true" },
    { name: "交差はだめ", code: "対応している([1, 2, -1, -2], [0, 0, 0, 0]) === false" },
    { name: "並んでいる", code: "対応している([1, -1, 2, -2], [0, 0, 0, 0]) === true" },
    { name: "閉じが余る", code: "対応している([-1], [0]) === false" },
    { name: "開きが余る", code: "対応している([1], [0]) === false" },
    { name: "種類ちがいで閉じる", code: "対応している([1, -2], [0, 0]) === false" },
    { name: "深い入れ子", code: "対応している([1, 1, 2, -2, -1, -1], [0, 0, 0, 0, 0, 0]) === true" },
  ],
  hints: [
    "`記号[i]` が正の数なら開き括弧です。`top ← top + 1` してから `stack[top] ← 記号[i]` と積みます。",
    "閉じ括弧のときは、まず `top = 0` (空) でないかを確かめます。空なら対応する開きが無いので `false` です。",
    "閉じ括弧と頂上の開き括弧が同じ種類かは `stack[top] ≠ -記号[i]` で調べられます (`-1` の相手は `1`)。最後に `return top = 0` で「開きっぱなしが無い」ことを確かめます。",
  ],
  solution: `○論理型: 対応している(整数型の配列: 記号, 整数型の配列: stack)
  整数型: top ← 0
  整数型: i
  for (i を 1 から 記号の要素数 まで 1 ずつ増やす)
    if (記号[i] > 0)
      top ← top + 1
      stack[top] ← 記号[i]
    else
      if (top = 0)
        return false
      endif
      if (stack[top] ≠ -記号[i])
        return false
      endif
      top ← top - 1
    endif
  endfor
  return top = 0
`,
};
