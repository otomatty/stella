import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch01RectangleArea: Assignment = {
  id: "S3-Ch01-04-rectangle-area",
  stage: "S3",
  chapterId: "Ch01",
  sequence: 4,
  title: "長方形の面積を計算して返す",
  newConcept: "複数の引数を変数として組み合わせて 1 つの値を返す",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

縦 \`height\` と 横 \`width\` を受け取り、 長方形の面積を返す関数 \`rectangleArea\` を実装してください。

\`\`\`js
rectangleArea(3, 4);   // → 12
rectangleArea(5, 5);   // → 25
rectangleArea(10, 0);  // → 0
\`\`\`

## ポイント

- 引数を 2 つ取って組み合わせる関数です。 順番は \`(height, width)\` です。
- 面積は \`height * width\` です。
`,
  starterFiles: singleFile(`function rectangleArea(height, width) {
  // ここを実装してください
}
`),
  entryPoints: ["rectangleArea"],
  demoCall: `console.log(rectangleArea(3, 4));`,
  tests: [
    {
      name: "rectangleArea(3, 4) は 12",
      code: `rectangleArea(3, 4) === 12`,
    },
    {
      name: "rectangleArea(5, 5) は 25",
      code: `rectangleArea(5, 5) === 25`,
    },
    {
      name: "rectangleArea(10, 0) は 0",
      code: `rectangleArea(10, 0) === 0`,
    },
    {
      name: "rectangleArea(7, 2) は 14",
      code: `rectangleArea(7, 2) === 14`,
    },
  ],
  hints: [
    "面積は `height * width` です。",
    "解答例:\n```js\nfunction rectangleArea(height, width) {\n  return height * width;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function rectangleArea(height, width) {
  return height * width;
}
`,
  badSolutions: [
    {
      code: `function rectangleArea(height, width) {
  return height + width;
}
`,
      description: "掛け算ではなく足し算を使っている",
    },
    {
      code: `function rectangleArea() {
  return 12;
}
`,
      description: "引数を使わず固定値を返している",
    },
  ],
  mdnSections: [
    {
      heading: "関数のパラメーター",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions",
      pageTitle: "関数",
    },
  ],
};
