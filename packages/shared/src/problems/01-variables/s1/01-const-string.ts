import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01ConstString: Assignment = {
  id: "S1-Ch01-01-const-string",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 1,
  title: "const で文字列を保持する",
  newConcept: "const を使って文字列を変数に入れて出力する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const\` で **\`greeting\` という変数** を作り、 \`"おはよう"\` を入れてください。 そのあと \`console.log\` で \`greeting\` を出力します。

## 期待する出力

\`\`\`
おはよう
\`\`\`

## ポイント

- \`const\` で作った変数の中身は **後から書き換えられません**。 一度入れた値をそのまま使うときに使います。
- 変数名は \`greeting\` (英単語) を使います。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が おはよう になる",
      expectedStdout: "おはよう",
    },
  ],
  hints: [
    "`const 変数名 = 値;` の形で、 値に名前を付けて取っておけます。",
    "値を出すときは `console.log(変数名)` の形で、 変数の **名前のまま** 渡します。",
    "解答例:\n```js\nconst greeting = \"おはよう\";\nconsole.log(greeting);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "greeting",
          label: "const greeting を宣言する",
        },
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "greeting" },
          label: "greeting 変数を console.log に渡す",
        },
      ],
    },
  },
  solution: `const greeting = "おはよう";
console.log(greeting);
`,
  badSolutions: [
    {
      code: `console.log("おはよう");
`,
      description: "変数を作らずに直接文字列を出力している",
    },
    {
      code: `let greeting = "おはよう";
console.log(greeting);
`,
      description: "const ではなく let で宣言している",
    },
  ],
  mdnSections: [
    { heading: "宣言" },
    { heading: "const" },
  ],
};
