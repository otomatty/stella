import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02Add: Assignment = {
  id: "S1-Ch02-01-add",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 1,
  title: "加算",
  newConcept: "+ 演算子で 2 つの数を足す",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`125 + 76\` の結果を \`console.log\` で出力してください。

答え (\`201\`) を直接書くのではなく、 **計算式そのもの** を console.log に渡します。

## 期待する出力

\`\`\`
201
\`\`\`
`,
  starterFiles: singleFile(`// console.log の中に 125 + 76 の式をそのまま書く

`),
  tests: [
    {
      name: "stdout が 201 になる",
      expectedStdout: "201",
    },
  ],
  hints: [
    "答えではなく、 **計算式** をそのまま書きます。",
    "`console.log(125 + 76);` のように、 `+` を使って 2 つの数をつなぎます。",
    "解答例:\n```js\nconsole.log(125 + 76);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "+" },
          label: "+ 演算子を使った計算式を console.log に渡す",
        },
      ],
    },
  },
  solution: `console.log(125 + 76);
`,
  badSolutions: [
    {
      code: `console.log(201);
`,
      description: "計算済みの答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "加算 (+)" },
  ],
};
