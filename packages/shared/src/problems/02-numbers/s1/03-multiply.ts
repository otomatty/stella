import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02Multiply: Assignment = {
  id: "S1-Ch02-03-multiply",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 3,
  title: "乗算",
  newConcept: "* 演算子で掛け算する",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`12 * 8\` の結果を \`console.log\` で出力してください。

数学で習った \`×\` ではなく、 \`*\` (アスタリスク) を使います。

## 期待する出力

\`\`\`
96
\`\`\`
`,
  starterFiles: singleFile(`// console.log の中に 12 * 8 の式を書く

`),
  tests: [
    {
      name: "stdout が 96 になる",
      expectedStdout: "96",
    },
  ],
  hints: [
    "掛け算は **アスタリスク** `*` を使います (`×` ではありません)。",
    "`console.log(12 * 8);` のように書きます。",
    "解答例:\n```js\nconsole.log(12 * 8);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "*" },
          label: "* 演算子を使った計算式を console.log に渡す",
        },
      ],
    },
  },
  solution: `console.log(12 * 8);
`,
  badSolutions: [
    {
      code: `console.log(96);
`,
      description: "計算済みの答えを直接出力している",
    },
  ],
};
