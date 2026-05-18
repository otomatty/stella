import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06ForCountUp: Assignment = {
  id: "S2-Ch06-01-for-count-up",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 1,
  title: "for で 0 から 4 まで順に出す",
  newConcept: "for ループの基本形 (let i = 0; i < n; i++)",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`for\` ループで \`0\` から \`4\` までを 1 行ずつ出力してください。

## 期待する出力

\`\`\`
0
1
2
3
4
\`\`\`

## ポイント

- \`for (let i = 0; i < 5; i++) { console.log(i); }\` の形が基本。
- \`let i = 0\`: 初期化 / \`i < 5\`: 続行条件 / \`i++\`: 毎回末尾で実行。
`,
  starterFiles: singleFile(`// for ループでカウンタ変数を 0 から始めて、 説明文の上限まで 1 ずつ増やしながら毎回 console.log で出力する

`),
  tests: [
    {
      name: "stdout が 0-4 の 5 行になる",
      expectedStdout: "0\n1\n2\n3\n4",
    },
  ],
  hints: [
    "`for (let i = 0; i < 5; i++) { ... }` の形で 5 回繰り返します。",
    "中で `console.log(i);` を呼べば現在の i が出力されます。",
    "解答例:\n```js\nfor (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `for (let i = 0; i < 5; i++) {
  console.log(i);
}
`,
  badSolutions: [
    {
      code: `console.log(0);
console.log(1);
console.log(2);
console.log(3);
console.log(4);
`,
      description: "for を使わず 1 行ずつ console.log している",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
