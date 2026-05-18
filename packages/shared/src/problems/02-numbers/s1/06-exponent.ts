import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02Exponent: Assignment = {
  id: "S1-Ch02-06-exponent",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 6,
  title: "累乗",
  newConcept: "** 演算子で n 乗を計算する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`2\` の \`8\` 乗を計算して出力してください。

累乗は \`*\` を **2 つ続けた** \`**\` を使います。 例: \`3 ** 2\` は \`9\` (= 3 の 2 乗)。

## 期待する出力

\`\`\`
256
\`\`\`
`,
  starterFiles: singleFile(`// console.log の中に 2 ** 8 の式を書く

`),
  tests: [
    {
      name: "stdout が 256 になる",
      expectedStdout: "256",
    },
  ],
  hints: [
    "累乗は `**` (アスタリスク 2 つ) を使います。 `*` 1 つでは掛け算になってしまいます。",
    "`console.log(2 ** 8);` で 256 が出力されます。",
    "解答例:\n```js\nconsole.log(2 ** 8);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "**" },
          label: "** 演算子 (累乗) を使う",
        },
      ],
    },
  },
  solution: `console.log(2 ** 8);
`,
  badSolutions: [
    {
      code: `console.log(2 * 2 * 2 * 2 * 2 * 2 * 2 * 2);
`,
      description: "** ではなく * を 8 回使っている",
    },
    {
      code: `console.log(256);
`,
      description: "計算済みの答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "べき乗 (**)" },
  ],
};
