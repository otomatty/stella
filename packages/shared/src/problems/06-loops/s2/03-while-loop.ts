import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06WhileLoop: Assignment = {
  id: "S2-Ch06-03-while-loop",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 3,
  title: "while で条件が真の間繰り返す",
  newConcept: "while は条件が偽になるまで繰り返す",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`while\` ループで \`1\` から \`3\` までを 1 行ずつ出力してください。

\`\`\`js
let i = 1;
while (i <= 3) {
  console.log(i);
  i++;
}
\`\`\`

## 期待する出力

\`\`\`
1
2
3
\`\`\`

## ポイント

- \`while (条件) { ... }\` は条件が真の間ずっと繰り返します。
- ループ内で **値を更新しないと無限ループ** になります。
`,
  starterFiles: singleFile(`// while の外で let のカウンタ変数を初期化する


// while で条件を満たす間ループし、 中で console.log で出力してからカウンタを 1 増やす

`),
  tests: [
    {
      name: "stdout が 1-3 の 3 行になる",
      expectedStdout: "1\n2\n3",
    },
  ],
  hints: [
    "ループ変数は while の外で `let i = 1;` のように宣言します。",
    "ループの中で `i++` を忘れずに。",
    "解答例:\n```js\nlet i = 1;\nwhile (i <= 3) {\n  console.log(i);\n  i++;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "WhileStatement", label: "while ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `let i = 1;
while (i <= 3) {
  console.log(i);
  i++;
}
`,
  badSolutions: [
    {
      code: `console.log(1);
console.log(2);
console.log(3);
`,
      description: "while を使わず 1 行ずつ console.log している",
    },
  ],
  mdnSections: [
    { heading: "while", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/while", pageTitle: "while" },
  ],
};
