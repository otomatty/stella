import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04SumArray: Assignment = {
  id: "S3-Ch04-01-sum-array",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 1,
  title: "配列の要素の合計を返す",
  newConcept: "for ループで配列を走査して累積する",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` を受け取り、 すべての要素の合計を返す関数 \`sumArray\` を実装してください。 空配列の場合は \`0\` を返します。

\`\`\`js
sumArray([1, 2, 3]);    // → 6
sumArray([10]);         // → 10
sumArray([]);           // → 0
sumArray([-1, -2, -3]); // → -6
\`\`\`

## ポイント

- \`let sum = 0\` で初期化し、 for ループで足していきます。
- \`for...of\` を使うと添字が要らず読みやすいです。
- \`reduce\` は Ch09 で導入するので、 ここでは普通のループで書きます。
`,
  starterFiles: singleFile(`function sumArray(arr) {
  // ここを実装してください
}
`),
  entryPoints: ["sumArray"],
  demoCall: `console.log(sumArray([1, 2, 3]));`,
  tests: [
    { name: "sumArray([1,2,3]) は 6", code: `sumArray([1,2,3]) === 6` },
    { name: "sumArray([10]) は 10", code: `sumArray([10]) === 10` },
    { name: "sumArray([]) は 0", code: `sumArray([]) === 0` },
    { name: "sumArray([-1,-2,-3]) は -6", code: `sumArray([-1,-2,-3]) === -6` },
    { name: "sumArray([100,200,300]) は 600", code: `sumArray([100,200,300]) === 600` },
  ],
  hints: [
    "for...of で各要素を足す。",
    "解答例:\n```js\nfunction sumArray(arr) {\n  let sum = 0;\n  for (const n of arr) {\n    sum += n;\n  }\n  return sum;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で合計を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S3 では reduce を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function sumArray(arr) {
  let sum = 0;
  for (const n of arr) {
    sum += n;
  }
  return sum;
}
`,
  badSolutions: [
    {
      code: `function sumArray(arr) {
  return arr.length;
}
`,
      description: "要素数を返している",
    },
    {
      code: `function sumArray(arr) {
  return arr.reduce((a, b) => a + b, 0);
}
`,
      description: "reduce 禁止 (forbidden 違反)",
    },
  ],
  mdnSections: [
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
