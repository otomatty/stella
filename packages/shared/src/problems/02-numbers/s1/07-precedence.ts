import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02Precedence: Assignment = {
  id: "S1-Ch02-07-precedence",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 7,
  title: "演算子の優先順位 (括弧)",
  newConcept: "() で計算順序を制御する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`(2 + 3) * 4\` の結果を出力してください。 **括弧の有無で結果が変わる** ことを確認します。

- \`2 + 3 * 4\` → \`14\` (掛け算が先)
- \`(2 + 3) * 4\` → \`20\` (括弧が先)

## 期待する出力

\`\`\`
20
\`\`\`

## ポイント

- 数学と同じく、 掛け算 (\`*\`) や割り算 (\`/\`) は足し算 (\`+\`) より **先に** 計算されます。
- 順序を変えたいときは **括弧 \`( )\`** で囲みます。
`,
  starterFiles: singleFile(`// console.log の中に (2 + 3) * 4 と書く
// 括弧を忘れると 14 になってしまう

`),
  tests: [
    {
      name: "stdout が 20 になる",
      expectedStdout: "20",
    },
  ],
  hints: [
    "括弧 `( )` で囲んだ部分が **先に** 計算されます。",
    "`(2 + 3)` を先に計算させるために、 全体を `console.log((2 + 3) * 4)` のように書きます。",
    "解答例:\n```js\nconsole.log((2 + 3) * 4);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "*" },
          label: "* 演算子を使う (掛け算は外側)",
        },
      ],
    },
  },
  solution: `console.log((2 + 3) * 4);
`,
  badSolutions: [
    {
      code: `console.log(2 + 3 * 4);
`,
      description: "括弧を付けていないため掛け算が先に計算され 14 になる",
    },
    {
      code: `console.log(20);
`,
      description: "計算済みの答えを直接出力している",
    },
  ],
};
