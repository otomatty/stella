import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02Modulo: Assignment = {
  id: "S1-Ch02-05-modulo",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 5,
  title: "剰余 (あまり)",
  newConcept: "% 演算子で割り算のあまりを求める",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`10 % 3\` を計算して結果を出力してください。

\`%\` は **「割ったあとに残るあまり」** を返します。 例: \`7 % 2\` は \`1\` (= 7 を 2 で割ると 3 あまり 1)。

## 期待する出力

\`\`\`
1
\`\`\`

## ポイント

- \`%\` は割り算の結果ではなく、 **あまり** を返します。
- 「偶数か奇数か」 を判定するときによく使います (例: \`n % 2\` が 0 なら偶数)。
`,
  starterFiles: singleFile(`// console.log の中に 10 % 3 の式を書く

`),
  tests: [
    {
      name: "stdout が 1 になる",
      expectedStdout: "1",
    },
  ],
  hints: [
    "あまりを求める演算子は `%` (パーセント記号) です。",
    "`console.log(10 % 3);` で 1 が出力されます (10 ÷ 3 = 3 あまり 1)。",
    "解答例:\n```js\nconsole.log(10 % 3);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "%" },
          label: "% 演算子 (剰余) を使う",
        },
      ],
    },
  },
  solution: `console.log(10 % 3);
`,
  badSolutions: [
    {
      code: `console.log(1);
`,
      description: "計算済みの答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "剰余 (%)" },
  ],
};
