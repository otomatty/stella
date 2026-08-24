import type { Assignment } from "../../../../../types.js";

/**
 * 再帰の課題 (#133)。
 * 「止める条件を先に書く」という再帰の骨格を、最小の例で身につける。
 */
export const s0FePseudoCh00Factorial: Assignment = {
  id: "S0-FePseudo-Ch00-09-factorial",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 109,
  title: "擬似言語: 階乗を再帰で求める",
  newConcept: "自分自身を呼び出す関数と、再帰を止める条件",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["階乗"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* n の階乗 (1 × 2 × ... × n) を返してください。
   0 の階乗は 1 です。必ず自分自身を呼び出す形 (再帰) で書いてください。 */
○整数型: 階乗(整数型: n)
  /* ここに処理を書く */
  return 1
`,
    },
  ],
  description: `## やること

\`階乗(n)\` を完成させてください。**再帰**で書きます。

- \`n\` の階乗 (\`1 × 2 × ... × n\`) を返す
- \`0\` の階乗は \`1\`

## 再帰の骨格

再帰は「**止める条件**」を先に書き、そのあとで自分自身を呼びます。

\`\`\`text
○整数型: 関数名(整数型: n)
  if (止める条件)
    return 決まった値       ← ここで再帰が止まる
  endif
  return ... 関数名(小さくした引数) ...
\`\`\`

止める条件を書き忘れると、呼び出しが終わらずエラーになります。

## 例

\`\`\`text
階乗(0) → 1
階乗(1) → 1
階乗(5) → 120     (1 × 2 × 3 × 4 × 5)
\`\`\`
`,
  tests: [
    { name: "0 の階乗は 1", code: "階乗(0) === 1" },
    { name: "1 の階乗は 1", code: "階乗(1) === 1" },
    { name: "3 の階乗", code: "階乗(3) === 6" },
    { name: "5 の階乗", code: "階乗(5) === 120" },
    { name: "10 の階乗", code: "階乗(10) === 3628800" },
  ],
  hints: [
    "止める条件は `if (n ≦ 1)` です。このとき `1` を返します (`0` と `1` の両方をまとめて扱えます)。",
    "それ以外では `return n × 階乗(n - 1)` と、引数を 1 つ小さくして自分を呼びます。",
    "`×` は `*` と書いても同じです。止める条件を書かないと呼び出しが終わらず、実行が打ち切られます。",
  ],
  solution: `○整数型: 階乗(整数型: n)
  if (n ≦ 1)
    return 1
  endif
  return n × 階乗(n - 1)
`,
};
