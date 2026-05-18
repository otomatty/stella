import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch05MaxOfThree: Assignment = {
  id: "S3-Ch05-05-max-of-three",
  stage: "S3",
  chapterId: "Ch05",
  sequence: 5,
  title: "3 つの数の最大値を if 文だけで返す",
  newConcept: "if のネスト・連鎖で最大値を判定する",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値 \`a\`, \`b\`, \`c\` を受け取り、 3 つのうちの最大値を返す関数 \`maxOfThree\` を実装してください。 \`Math.max\` は使わずに、 if 文だけで実装してください。

\`\`\`js
maxOfThree(1, 2, 3);    // → 3
maxOfThree(5, 2, 4);    // → 5
maxOfThree(-1, -2, -3); // → -1
maxOfThree(7, 7, 7);    // → 7
\`\`\`

## ポイント

- 「一番大きい候補を 1 つずつ更新する」 と書きやすいです: \`let m = a; if (b > m) m = b; if (c > m) m = c;\`
`,
  starterFiles: singleFile(`function maxOfThree(a, b, c) {
  // ここを実装してください (Math.max は使わない)
}
`),
  entryPoints: ["maxOfThree"],
  demoCall: `console.log(maxOfThree(1, 2, 3));`,
  tests: [
    { name: "maxOfThree(1,2,3) は 3", code: `maxOfThree(1,2,3) === 3` },
    { name: "maxOfThree(5,2,4) は 5", code: `maxOfThree(5,2,4) === 5` },
    { name: "maxOfThree(-1,-2,-3) は -1", code: `maxOfThree(-1,-2,-3) === -1` },
    { name: "maxOfThree(7,7,7) は 7", code: `maxOfThree(7,7,7) === 7` },
    { name: "maxOfThree(0,10,5) は 10", code: `maxOfThree(0,10,5) === 10` },
  ],
  hints: [
    "let m = a; if (b > m) m = b; if (c > m) m = c; return m;",
    "解答例:\n```js\nfunction maxOfThree(a, b, c) {\n  let m = a;\n  if (b > m) m = b;\n  if (c > m) m = c;\n  return m;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で最大値を返す" },
        { kind: "node", nodeType: "IfStatement", label: "if 文で比較する (三項演算子のみは不可)" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "max", label: "Math.max を使わない" },
      ],
    },
  },
  solution: `function maxOfThree(a, b, c) {
  let m = a;
  if (b > m) {
    m = b;
  }
  if (c > m) {
    m = c;
  }
  return m;
}
`,
  badSolutions: [
    {
      code: `function maxOfThree(a, b, c) {
  return Math.max(a, b, c);
}
`,
      description: "Math.max を使っている (forbidden)",
    },
    {
      code: `function maxOfThree(a, b, c) {
  return a;
}
`,
      description: "比較せず a を返している",
    },
  ],
  mdnSections: [
    {
      heading: "if...else",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/if...else",
      pageTitle: "if...else",
    },
  ],
};
