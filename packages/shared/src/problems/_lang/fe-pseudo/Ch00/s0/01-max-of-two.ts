import type { Assignment } from "../../../../../types.js";

/**
 * 擬似言語の最初の課題 (#133)。
 * 宣言・`if`・`return` だけで書ける最小の関数で、記法と採点の流れに慣れる。
 */
export const s0FePseudoCh00MaxOfTwo: Assignment = {
  id: "S0-FePseudo-Ch00-01-max-of-two",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 101,
  title: "擬似言語: 大きい方を返す",
  newConcept: "宣言・代入・if で分岐して値を返す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["大きい方"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* a と b のうち大きい方を返してください。
   等しいときはその値を返します。 */
○整数型: 大きい方(整数型: a, 整数型: b)
  /* ここに処理を書く */
  return 0
`,
    },
  ],
  description: `## やること

本試験と同じ**擬似言語**で書きます。TypeScript や JavaScript ではありません。

\`大きい方(a, b)\` を完成させてください。

- \`a\` と \`b\` のうち **大きい方の値**を返す
- 等しいときはその値を返す

## 擬似言語の書き方

\`\`\`text
○整数型: 関数名(整数型: 引数)   ← 関数の定義。○ で始める
  整数型: x ← 1                 ← 宣言と代入。代入は ←
  if (条件)
    return x
  endif
  return 0
\`\`\`

- 関数の本体は \`○\` の行より**深くインデント**します。
- \`←\` は \`<-\` と書いても同じです。\`≧\` は \`>=\`、\`≦\` は \`<=\`、\`≠\` は \`!=\` でも通ります。
- 比較の \`=\` は「等しい」の意味です (代入ではありません)。
`,
  tests: [
    { name: "b の方が大きい", code: "大きい方(3, 5) === 5" },
    { name: "a の方が大きい", code: "大きい方(5, 3) === 5" },
    { name: "等しいときはその値", code: "大きい方(4, 4) === 4" },
    { name: "負の数どうし", code: "大きい方(-2, -7) === -2" },
  ],
  hints: [
    "`if (a ≧ b)` のように比較して、真のときに `return a` します。",
    "`if` は `endif` で閉じます。`else` を使っても、`if` の後にそのまま `return b` を書いても構いません。",
    "`≧` が打ちにくければ `>=` と書けます。",
  ],
  solution: `○整数型: 大きい方(整数型: a, 整数型: b)
  if (a ≧ b)
    return a
  endif
  return b
`,
};
