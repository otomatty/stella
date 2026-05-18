import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02MathAbs: Assignment = {
  id: "S1-Ch02-10-math-abs",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 10,
  title: "Math.abs で絶対値を求める",
  newConcept: "Math.abs(x) で x の絶対値を得る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`Math.abs\` を使って \`-7\` の絶対値を出力してください。

\`Math.abs(x)\` は **負の数を正の数に** 変えます (符号を取り除く)。 例: \`Math.abs(-3)\` は \`3\`、 \`Math.abs(5)\` は \`5\`。

## 期待する出力

\`\`\`
7
\`\`\`
`,
  starterFiles: singleFile(`// console.log の中で Math.abs(-7) を呼ぶ

`),
  tests: [
    {
      name: "stdout が 7 になる",
      expectedStdout: "7",
    },
  ],
  hints: [
    "絶対値は `Math.abs(数値)` で計算できます。",
    "`Math.abs(-7)` は `7` を返します。",
    "解答例:\n```js\nconsole.log(Math.abs(-7));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "abs", label: "Math.abs を呼ぶ" },
      ],
    },
  },
  solution: `console.log(Math.abs(-7));
`,
  badSolutions: [
    {
      code: `console.log(7);
`,
      description: "Math.abs を使わず答えを直接出力している",
    },
  ],
};
