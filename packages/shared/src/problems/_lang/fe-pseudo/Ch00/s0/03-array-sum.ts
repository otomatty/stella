import type { Assignment } from "../../../../../types.js";

/**
 * 配列走査の課題 (#133)。
 * 擬似言語の添字が 1 から始まることを、手を動かして確かめるのが狙い。
 */
export const s0FePseudoCh00ArraySum: Assignment = {
  id: "S0-FePseudo-Ch00-03-array-sum",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 103,
  title: "擬似言語: 配列の合計",
  newConcept: "1 起点の添字で配列を先頭から末尾まで走査する",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["配列の合計"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* data のすべての要素を足した値を返してください。 */
○整数型: 配列の合計(整数型の配列: data)
  /* ここに処理を書く */
  return 0
`,
    },
  ],
  description: `## やること

\`配列の合計(data)\` を完成させてください。\`data\` のすべての要素を足した値を返します。

## 擬似言語の配列

**擬似言語の配列の添字は 1 から始まります。**JavaScript や Python とは違います。

\`\`\`text
data ← {24, 11, 35}
data[1]              ← 先頭の要素 (24)
data[3]              ← 末尾の要素 (35)
dataの要素数         ← 要素の個数 (3)
data[0]              ← 範囲外。エラーになります
\`\`\`

配列を先頭から末尾まで走査する形はこうなります。

\`\`\`text
for (i を 1 から dataの要素数 まで 1 ずつ増やす)
  ...
endfor
\`\`\`

> 添字を \`0\` から始めると **範囲外アクセスのエラー**になります。試験でも最も問われるところです。
`,
  tests: [
    { name: "5 要素の合計", code: "配列の合計([1, 2, 3, 4, 5]) === 15" },
    { name: "1 要素", code: "配列の合計([7]) === 7" },
    { name: "負の数を含む", code: "配列の合計([-1, 1, -5]) === -5" },
    { name: "先頭も末尾も数える", code: "配列の合計([10, 0, 0, 0, 10]) === 20" },
  ],
  hints: [
    "合計用の変数を `整数型: s ← 0` で用意します。",
    "`for (i を 1 から dataの要素数 まで 1 ずつ増やす)` で添字 `i` を 1 から動かします。",
    "ループの中で `s ← s + data[i]` と足していきます。`data[0]` は範囲外なので使いません。",
  ],
  commonMistakes: [
    { pattern: "data[0]", message: "擬似言語の配列の添字は 1 から始まります。`data[0]` は範囲外です。" },
  ],
  solution: `○整数型: 配列の合計(整数型の配列: data)
  整数型: s ← 0
  整数型: i
  for (i を 1 から dataの要素数 まで 1 ずつ増やす)
    s ← s + data[i]
  endfor
  return s
`,
};
