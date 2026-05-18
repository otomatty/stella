import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02MathFloor: Assignment = {
  id: "S1-Ch02-08-math-floor",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 8,
  title: "Math.floor で小数点以下を切り捨てる",
  newConcept: "Math.floor(x) で x を切り捨てた整数を得る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`Math.floor\` を使って \`3.7\` を切り捨てた値を出力してください。

\`Math.floor(x)\` は **小数点以下を切り捨てた整数** を返します。 例: \`Math.floor(2.9)\` は \`2\`。

## 期待する出力

\`\`\`
3
\`\`\`
`,
  starterFiles: singleFile(`// 説明文の小数を Math.floor で切り捨てて、 結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 3 になる",
      expectedStdout: "3",
    },
  ],
  hints: [
    "切り捨ては `Math.floor(数値)` で計算できます。",
    "`Math.floor(3.7)` は `3` を返します。",
    "解答例:\n```js\nconsole.log(Math.floor(3.7));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "floor", label: "Math.floor を呼ぶ" },
      ],
    },
  },
  solution: `console.log(Math.floor(3.7));
`,
  badSolutions: [
    {
      code: `console.log(3);
`,
      description: "Math.floor を使わず答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "Math.floor()" },
  ],
};
