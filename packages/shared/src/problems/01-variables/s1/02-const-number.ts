import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01ConstNumber: Assignment = {
  id: "S1-Ch01-02-const-number",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 2,
  title: "const で数値を保持する",
  newConcept: "const は文字列だけでなく数値も保持できる",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const\` で **\`price\` という変数** を作り、 数値 \`1980\` を入れて、 そのまま \`console.log\` で出力してください。

数値は \`"\` で囲まずに、 そのまま書きます。

## 期待する出力

\`\`\`
1980
\`\`\`
`,
  starterFiles: singleFile(`// 数値を const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 1980 になる",
      expectedStdout: "1980",
    },
  ],
  hints: [
    "数値は文字列と違って **クォートで囲みません**。",
    "`const price = 1980;` のように、 = の右側にそのまま数字を書きます。",
    "解答例:\n```js\nconst price = 1980;\nconsole.log(price);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "price",
          label: "const price を宣言する",
        },
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "price" },
          label: "price 変数を console.log に渡す",
        },
      ],
    },
  },
  solution: `const price = 1980;
console.log(price);
`,
  badSolutions: [
    {
      code: `console.log(1980);
`,
      description: "変数 price を作らずに数値を直接出力している",
    },
  ],
};
