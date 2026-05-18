import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s0Ch00PrintTwoLines: Assignment = {
  id: "S0-Ch00-05-print-two-lines",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 5,
  title: "2 行出す",
  newConcept: "console.log を複数回呼んで複数行を出す",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`console.log\` を **2 回** 使って、 1 行目に \`Hello\`、 2 行目に \`World\` を出してください。

\`console.log\` は呼び出すたびに 1 行ぶん出力します。

## 期待する出力

\`\`\`
Hello
World
\`\`\`

## ヒント

- \`console.log\` を 1 回だけ書くのでは、 1 行しか出ません。
- 命令を 2 つ並べたいときは、 1 行ずつ書いて末尾に \`;\` を付けます。
`,
  starterFiles: singleFile(`// 1 行目に Hello、2 行目に World を出力してください
// console.log を 2 回書くのがポイント

`),
  tests: [
    {
      name: "1 行目に Hello、2 行目に World が出る",
      expectedStdout: "Hello\nWorld",
    },
  ],
  hints: [
    "1 つの `console.log` は 1 行しか出力しません。 2 行欲しいときは 2 回呼びます。",
    "`console.log(\"Hello\");` を書いた次の行に、もう 1 つ `console.log(\"World\");` を書いてみましょう。",
    "解答例:\n```js\nconsole.log(\"Hello\");\nconsole.log(\"World\");\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "string", value: "Hello" },
          label: "Hello を console.log で出力する",
        },
        {
          kind: "console-log",
          argument: { kind: "string", value: "World" },
          label: "World を console.log で出力する",
        },
      ],
    },
  },
  solution: `console.log("Hello");
console.log("World");
`,
  badSolutions: [
    {
      code: `console.log("Hello\\nWorld");
`,
      description: "1 回の console.log で改行入り文字列を出力している",
    },
  ],
};
