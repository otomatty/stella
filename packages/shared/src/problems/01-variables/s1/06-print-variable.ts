import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01PrintVariable: Assignment = {
  id: "S1-Ch01-06-print-variable",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 6,
  title: "変数の中身を console.log で出す",
  newConcept: "変数を console.log に渡すと、 中身が出力される",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`message\` という変数に \`"Hello, JavaScript!"\` を入れ、 その変数を **2 回** \`console.log\` で出力してください。

## 期待する出力

\`\`\`
Hello, JavaScript!
Hello, JavaScript!
\`\`\`

## ポイント

- 一度変数に入れた値は、 何度でも使い回せます。
- 同じ文字列を 2 回書く必要はなく、 \`console.log(message)\` を 2 回呼ぶだけで OK。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// その変数を console.log で 2 回続けて出力する

`),
  tests: [
    {
      name: "stdout が同じ行を 2 回出力する",
      expectedStdout: "Hello, JavaScript!\nHello, JavaScript!",
    },
  ],
  hints: [
    "変数に入れた値は、 名前で何度でも呼び出せます。",
    "`console.log(message)` を 2 回続けて書けば、 同じ内容を 2 回出力できます。",
    "解答例:\n```js\nconst message = \"Hello, JavaScript!\";\nconsole.log(message);\nconsole.log(message);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "message",
          label: "const message を宣言する",
        },
      ],
    },
  },
  solution: `const message = "Hello, JavaScript!";
console.log(message);
console.log(message);
`,
  badSolutions: [
    {
      code: `console.log("Hello, JavaScript!");
console.log("Hello, JavaScript!");
`,
      description: "変数を使わずに文字列を直接 2 回出力している",
    },
  ],
};
