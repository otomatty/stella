import type { Assignment } from "../../../../../types.js";

/**
 * 繰返し処理の課題 (#133)。
 * `while` と累積用の変数という、科目B のトレース問題で最頻出の形をなぞる。
 */
export const s0FePseudoCh00SumToN: Assignment = {
  id: "S0-FePseudo-Ch00-02-sum-to-n",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 102,
  title: "擬似言語: 1 から n までの合計",
  newConcept: "while で繰り返しながら合計を累積する",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["合計"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* 1 から n までの整数の合計を返してください。
   n が 0 以下のときは 0 を返します。 */
○整数型: 合計(整数型: n)
  /* ここに処理を書く */
  return 0
`,
    },
  ],
  description: `## やること

\`合計(n)\` を完成させてください。

- \`1\` から \`n\` までの整数をすべて足した値を返す
- \`n\` が 0 以下のときは \`0\` を返す

## 擬似言語の書き方

\`\`\`text
整数型: i ← 1        ← 宣言と同時に初期値を入れられる
while (i ≦ n)        ← 条件が真の間くり返す
  i ← i + 1
endwhile
\`\`\`

\`for\` を使っても構いません。

\`\`\`text
for (i を 1 から n まで 1 ずつ増やす)
  ...
endfor
\`\`\`

> \`for\` の終わりの値 (\`n\`) は**その値も含みます**。
`,
  tests: [
    { name: "1 から 5 まで", code: "合計(5) === 15" },
    { name: "n が 1", code: "合計(1) === 1" },
    { name: "n が 0 のときは 0", code: "合計(0) === 0" },
    { name: "n が負のときは 0", code: "合計(-3) === 0" },
    { name: "1 から 100 まで", code: "合計(100) === 5050" },
  ],
  hints: [
    "合計を入れておく変数 (例: `整数型: s ← 0`) と、数える変数 (例: `整数型: i ← 1`) を用意します。",
    "`while (i ≦ n)` の中で `s ← s + i` と `i ← i + 1` を両方行います。`i` を増やし忘れると終わりません。",
    "`n` が 0 以下なら while の条件が最初から偽になるので、`s` の初期値 0 がそのまま返ります。",
  ],
  solution: `○整数型: 合計(整数型: n)
  整数型: s ← 0
  整数型: i ← 1
  while (i ≦ n)
    s ← s + i
    i ← i + 1
  endwhile
  return s
`,
};
