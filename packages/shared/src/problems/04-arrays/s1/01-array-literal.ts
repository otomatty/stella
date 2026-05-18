import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04ArrayLiteral: Assignment = {
  id: "S1-Ch04-01-array-literal",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 1,
  title: "配列リテラルを書く",
  newConcept: "[ ] で複数の値を 1 つにまとめた配列を作る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

数値 \`10\` / \`20\` / \`30\` を要素に持つ配列を const \`numbers\` に入れて、 \`numbers\` を console.log で出力してください。

配列は \`[要素1, 要素2, 要素3]\` の形で書きます。

## 期待する出力

\`\`\`
[10,20,30]
\`\`\`

## ポイント

- console.log に配列を渡すと、 そのまま \`[10,20,30]\` のように表示されます (環境によって少し見え方が違う場合があります)。
`,
  starterFiles: singleFile(`// 数値を [ ] で並べた配列を const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [10,20,30] になる",
      expectedStdout: "[10,20,30]",
    },
  ],
  hints: [
    "配列は `[ ]` の中に値をカンマ区切りで並べます。",
    "`const numbers = [10, 20, 30];` で配列を作り、 `console.log(numbers);` で出力します。",
    "解答例:\n```js\nconst numbers = [10, 20, 30];\nconsole.log(numbers);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "numbers",
          label: "const numbers を宣言する",
        },
      ],
    },
  },
  solution: `const numbers = [10, 20, 30];
console.log(numbers);
`,
  mdnSections: [
    { heading: "配列の作成" },
  ],
};
