import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02MathRound: Assignment = {
  id: "S1-Ch02-09-math-round",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 9,
  title: "Math.round で四捨五入する",
  newConcept: "Math.round(x) で x を四捨五入した整数を得る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`Math.round\` を使って \`2.6\` を四捨五入した値を出力してください。

\`Math.round(x)\` は **四捨五入** で最も近い整数を返します。 例: \`Math.round(1.4)\` は \`1\`、 \`Math.round(1.5)\` は \`2\`。

## 期待する出力

\`\`\`
3
\`\`\`
`,
  starterFiles: singleFile(`// 説明文の小数を Math.round で四捨五入して、 結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 3 になる",
      expectedStdout: "3",
    },
  ],
  hints: [
    "四捨五入は `Math.round(数値)` で計算できます。",
    "`Math.round(2.6)` は `3` を返します。",
    "解答例:\n```js\nconsole.log(Math.round(2.6));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "round", label: "Math.round を呼ぶ" },
      ],
    },
  },
  solution: `console.log(Math.round(2.6));
`,
  badSolutions: [
    {
      code: `console.log(3);
`,
      description: "Math.round を使わず答えを直接出力している",
    },
  ],
};
