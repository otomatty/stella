import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04Length: Assignment = {
  id: "S1-Ch04-03-length",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 3,
  title: "配列の length を取得する",
  newConcept: "配列.length で要素数を得る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const colors = ["red", "green", "blue", "yellow"];\` のような配列を作り、 \`colors.length\` で **要素数** を出力してください。

文字列のときと同じく、 \`.length\` の後ろにカッコは付けません。

## 期待する出力

\`\`\`
4
\`\`\`
`,
  starterFiles: singleFile(`// 配列を const の変数に入れる


// その変数の length プロパティを console.log で出力する

`),
  tests: [
    {
      name: "stdout が 4 になる",
      expectedStdout: "4",
    },
  ],
  hints: [
    "`配列.length` で要素数が得られます。",
    "`colors.length` は `4` を返します (要素は 4 つ)。",
    "解答例:\n```js\nconst colors = [\"red\", \"green\", \"blue\", \"yellow\"];\nconsole.log(colors.length);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "colors",
          label: "const colors を宣言する",
        },
      ],
    },
  },
  solution: `const colors = ["red", "green", "blue", "yellow"];
console.log(colors.length);
`,
  mdnSections: [
    { heading: "Array: length プロパティ" },
  ],
};
