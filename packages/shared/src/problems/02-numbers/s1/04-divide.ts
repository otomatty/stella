import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02Divide: Assignment = {
  id: "S1-Ch02-04-divide",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 4,
  title: "除算",
  newConcept: "/ 演算子で割り算する",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`84 / 4\` の結果を \`console.log\` で出力してください。

割り算は \`÷\` ではなく \`/\` (スラッシュ) を使います。

## 期待する出力

\`\`\`
21
\`\`\`
`,
  starterFiles: singleFile(`// console.log の中に 84 / 4 の式を書く

`),
  tests: [
    {
      name: "stdout が 21 になる",
      expectedStdout: "21",
    },
  ],
  hints: [
    "割り算は **スラッシュ** `/` を使います。",
    "`console.log(84 / 4);` のように書きます。",
    "解答例:\n```js\nconsole.log(84 / 4);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "/" },
          label: "/ 演算子を使った計算式を console.log に渡す",
        },
      ],
    },
  },
  solution: `console.log(84 / 4);
`,
  badSolutions: [
    {
      code: `console.log(21);
`,
      description: "計算済みの答えを直接出力している",
    },
  ],
};
