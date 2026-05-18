import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch06MultiplicationTableRow: Assignment = {
  id: "S3-Ch06-02-multiplication-table-row",
  stage: "S3",
  chapterId: "Ch06",
  sequence: 2,
  title: "九九の 1 行分を配列で返す",
  newConcept: "ループで計算結果を配列に組み立てる",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

整数 \`n\` を受け取り、 \`[n*1, n*2, ..., n*9]\` の 9 要素の配列を返す関数 \`multiplicationTableRow\` を実装してください。

\`\`\`js
multiplicationTableRow(3);
// → [3, 6, 9, 12, 15, 18, 21, 24, 27]

multiplicationTableRow(1);
// → [1, 2, 3, 4, 5, 6, 7, 8, 9]
\`\`\`

## ポイント

- 空配列 \`const row = []\` に for ループで \`row.push(n * i)\` を 9 回行います。
`,
  starterFiles: singleFile(`function multiplicationTableRow(n) {
  // ここを実装してください
}
`),
  entryPoints: ["multiplicationTableRow"],
  demoCall: `console.log(multiplicationTableRow(7));`,
  tests: [
    {
      name: "multiplicationTableRow(3) は [3,6,9,12,15,18,21,24,27]",
      code: `(() => { const r = multiplicationTableRow(3); return JSON.stringify(r) === "[3,6,9,12,15,18,21,24,27]"; })()`,
    },
    {
      name: "multiplicationTableRow(1) は [1,2,3,4,5,6,7,8,9]",
      code: `(() => { const r = multiplicationTableRow(1); return JSON.stringify(r) === "[1,2,3,4,5,6,7,8,9]"; })()`,
    },
    {
      name: "multiplicationTableRow(9) の末尾は 81",
      code: `multiplicationTableRow(9)[8] === 81`,
    },
    {
      name: "multiplicationTableRow(5) の長さは 9",
      code: `multiplicationTableRow(5).length === 9`,
    },
  ],
  hints: [
    "i は 1 から 9 まで。",
    "解答例:\n```js\nfunction multiplicationTableRow(n) {\n  const row = [];\n  for (let i = 1; i <= 9; i++) {\n    row.push(n * i);\n  }\n  return row;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function multiplicationTableRow(n) {
  const row = [];
  for (let i = 1; i <= 9; i++) {
    row.push(n * i);
  }
  return row;
}
`,
  badSolutions: [
    {
      code: `function multiplicationTableRow(n) {
  const row = [];
  for (let i = 0; i < 9; i++) {
    row.push(n * i);
  }
  return row;
}
`,
      description: "i が 0 から始まっていて先頭が 0 になる",
    },
    {
      code: `function multiplicationTableRow(n) {
  return [n, n+n, n*3, n*4, n*5, n*6, n*7, n*8, n*9];
}
`,
      description: "ループを使っていない (AST required 違反)",
    },
  ],
  mdnSections: [
    {
      heading: "for 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for",
      pageTitle: "for",
    },
  ],
};
