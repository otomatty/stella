import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02MathMax: Assignment = {
  id: "S1-Ch02-11-math-max",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 11,
  title: "Math.max で最大値を求める",
  newConcept: "Math.max(a, b, c) で複数の数のうち最大値を得る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`Math.max\` を使って \`12\` / \`45\` / \`23\` の **3 つのうち最大** を出力してください。

\`Math.max(a, b, c, ...)\` は引数のうち **一番大きい数** を返します。

## 期待する出力

\`\`\`
45
\`\`\`
`,
  starterFiles: singleFile(`// 説明文の 3 つの数値を Math.max に渡して最大値を求め、 結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 45 になる",
      expectedStdout: "45",
    },
  ],
  hints: [
    "最大値は `Math.max(値1, 値2, 値3, ...)` で計算できます。 引数はカンマ区切りで何個でも書けます。",
    "`Math.max(12, 45, 23)` は `45` を返します。",
    "解答例:\n```js\nconsole.log(Math.max(12, 45, 23));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "max", label: "Math.max を呼ぶ" },
      ],
    },
  },
  solution: `console.log(Math.max(12, 45, 23));
`,
  badSolutions: [
    {
      code: `console.log(45);
`,
      description: "Math.max を使わず答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "Math.max()" },
  ],
};
