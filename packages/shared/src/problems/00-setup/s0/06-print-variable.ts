import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s0Ch00PrintVariable: Assignment = {
  id: "S0-Ch00-06-print-variable",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 6,
  title: "変数に入れて出す",
  newConcept: "const で変数に値を入れ、変数を console.log に渡す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const\` を使って **\`message\` という名前の変数** に \`Hello\` という文字列を入れ、 その変数を \`console.log\` で出力してください。

## 期待する出力

\`\`\`
Hello
\`\`\`

## ヒント

- \`const message = "Hello";\` のように書くと、 \`message\` という箱に \`"Hello"\` を入れたことになります。
- そのあと \`console.log(message)\` と書くと、 箱の中身 (= \`"Hello"\`) が出力されます。
- 文字列を **直接** \`console.log\` に渡すのではなく、 一度変数に入れてから渡すのが今回のポイントです。
`,
  starterFiles: singleFile(`// 1. const で message という変数を作り、"Hello" を入れる
// 2. console.log で message を出力する

`),
  tests: [
    {
      name: "stdout が Hello になる",
      expectedStdout: "Hello",
    },
  ],
  hints: [
    "`const 変数名 = 値;` の形で変数を作ります。 名前は `message` にしましょう。",
    "`console.log` には、 文字列だけでなく **変数の名前** も渡せます。 渡した変数の中身が出力されます。",
    "解答例:\n```js\nconst message = \"Hello\";\nconsole.log(message);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "message",
          label: "const message を宣言する",
        },
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "message" },
          label: "message 変数を console.log に渡す",
        },
      ],
    },
  },
  solution: `const message = "Hello";
console.log(message);
`,
  badSolutions: [
    {
      code: `let message = "Hello";
console.log(message);
`,
      description: "let で message を宣言している",
    },
    {
      code: `const message = "Hello";
console.log("Hello");
`,
      description: "宣言した message ではなく文字列を直接出力している",
    },
  ],
};
