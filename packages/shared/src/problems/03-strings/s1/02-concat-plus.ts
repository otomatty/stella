import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03ConcatPlus: Assignment = {
  id: "S1-Ch03-02-concat-plus",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 2,
  title: "+ で文字列を連結する",
  newConcept: "文字列同士は + でつなげられる",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"Hello, " + "World"\` を計算した結果を console.log で出力してください。

文字列の \`+\` は **連結** (つなぐ) 操作です。

## 期待する出力

\`\`\`
Hello, World
\`\`\`
`,
  starterFiles: singleFile(`// console.log の中で 2 つの文字列を + でつなぐ

`),
  tests: [
    {
      name: "stdout が Hello, World になる",
      expectedStdout: "Hello, World",
    },
  ],
  hints: [
    "文字列の `+` は連結です。 `\"a\" + \"b\"` は `\"ab\"`。",
    "`console.log(\"Hello, \" + \"World\");` のように書きます。",
    "解答例:\n```js\nconsole.log(\"Hello, \" + \"World\");\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "+" },
          label: "+ で 2 つの文字列を連結する",
        },
      ],
    },
  },
  solution: `console.log("Hello, " + "World");
`,
  badSolutions: [
    {
      code: `console.log("Hello, World");
`,
      description: "+ で連結せず連結済みの文字列を直接書いている",
    },
  ],
};
