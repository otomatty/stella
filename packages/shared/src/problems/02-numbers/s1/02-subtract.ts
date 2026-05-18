import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02Subtract: Assignment = {
  id: "S1-Ch02-02-subtract",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 2,
  title: "減算",
  newConcept: "- 演算子で引き算する",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`100 - 37\` の結果を \`console.log\` で出力してください。

## 期待する出力

\`\`\`
63
\`\`\`
`,
  starterFiles: singleFile(`// console.log の中に 100 - 37 の式を書く

`),
  tests: [
    {
      name: "stdout が 63 になる",
      expectedStdout: "63",
    },
  ],
  hints: [
    "引き算は `-` 演算子を使います。",
    "`console.log(100 - 37);` のように書きます。",
    "解答例:\n```js\nconsole.log(100 - 37);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "-" },
          label: "- 演算子を使った計算式を console.log に渡す",
        },
      ],
    },
  },
  solution: `console.log(100 - 37);
`,
  badSolutions: [
    {
      code: `console.log(63);
`,
      description: "計算済みの答えを直接出力している",
    },
  ],
};
