import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09DoubleAll: Assignment = {
  id: "S3-Ch09-01-double-all",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 1,
  title: "配列の全要素を 2 倍にして返す (map)",
  newConcept: "Array.prototype.map で要素を変換する",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` を受け取り、 全要素を 2 倍にした **新しい配列** を返す関数 \`doubleAll\` を実装してください。 \`map\` を使ってください。

\`\`\`js
doubleAll([1, 2, 3]);     // → [2, 4, 6]
doubleAll([]);            // → []
doubleAll([-1, -2]);      // → [-2, -4]
doubleAll([0, 0, 0]);     // → [0, 0, 0]
\`\`\`

## ポイント

- \`arr.map((n) => n * 2)\` で一発。
- \`map\` は元配列を変更しません。
`,
  starterFiles: singleFile(`function doubleAll(arr) {
  // ここを実装してください (map を使う)
}
`),
  entryPoints: ["doubleAll"],
  demoCall: `console.log(doubleAll([1, 2, 3]));`,
  tests: [
    {
      name: "doubleAll([1,2,3]) は [2,4,6]",
      code: `JSON.stringify(doubleAll([1,2,3])) === "[2,4,6]"`,
    },
    {
      name: "doubleAll([]) は []",
      code: `(() => { const r = doubleAll([]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "doubleAll([-1,-2]) は [-2,-4]",
      code: `JSON.stringify(doubleAll([-1,-2])) === "[-2,-4]"`,
    },
    {
      name: "doubleAll([0,0,0]) は [0,0,0]",
      code: `JSON.stringify(doubleAll([0,0,0])) === "[0,0,0]"`,
    },
    {
      name: "元配列は変更されない",
      code: `(() => { const src = [1,2,3]; doubleAll(src); return JSON.stringify(src) === "[1,2,3]"; })()`,
    },
  ],
  hints: [
    "arr.map((n) => n * 2);",
    "解答例:\n```js\nfunction doubleAll(arr) {\n  return arr.map((n) => n * 2);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "method", name: "map", label: "Array.map を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function doubleAll(arr) {
  return arr.map((n) => n * 2);
}
`,
  badSolutions: [
    {
      code: `function doubleAll(arr) {
  const result = [];
  for (const n of arr) result.push(n * 2);
  return result;
}
`,
      description: "map を使っていない (required 違反)",
    },
    {
      code: `function doubleAll(arr) {
  return arr.map((n) => n);
}
`,
      description: "2 倍していない",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.map()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      pageTitle: "Array.prototype.map()",
    },
  ],
};
