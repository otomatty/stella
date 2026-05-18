import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s0Ch00PrintNumber: Assignment = {
  id: "S0-Ch00-03-print-number",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 3,
  title: "数字を出す",
  newConcept: "数値リテラル (クォート不要で数字を書ける)",
  estimatedMinutes: 3,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`console.log\` で **数字の \`42\`** を出してください。

数字はクォート (\`"\`) で囲まなくても書けます。

## 期待する出力

\`\`\`
42
\`\`\`

## ヒント

- 文字列と数値は別の種類の値です。
- \`console.log(42)\` と \`console.log("42")\` はどちらも画面には \`42\` と出ますが、ここでは **数値として** 渡せていれば OK です。
`,
  starterFiles: singleFile(`// console.log で数字の 42 を出力してください
// 文字列とは違って、数字は "" で囲まなくても渡せます
`),
  tests: [
    {
      name: "stdout が 42 になる",
      expectedStdout: "42",
    },
  ],
  hints: [
    "`console.log` に **そのまま数字** を渡すことができます。",
    "数字は `\"` で囲まなくても書けます。文字列との違いに注目してみてください。",
    "`console.log(42);` と書きます。",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "number", value: 42 },
          label: "数値リテラル 42 を console.log に渡す",
        },
      ],
    },
  },
  solution: `console.log(42);
`,
  badSolutions: [
    {
      code: `console.log("42");
`,
      description: "文字列の 42 を出力している",
    },
  ],
};
