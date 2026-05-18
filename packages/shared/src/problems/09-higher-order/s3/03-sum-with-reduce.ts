import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09SumWithReduce: Assignment = {
  id: "S3-Ch09-03-sum-with-reduce",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 3,
  title: "reduce で合計を計算する",
  newConcept: "Array.prototype.reduce で集約する",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` を受け取り、 \`reduce\` を使って合計を返す関数 \`sumWithReduce\` を実装してください。 空配列の場合は \`0\` を返します。

\`\`\`js
sumWithReduce([1, 2, 3]);     // → 6
sumWithReduce([]);            // → 0
sumWithReduce([10, -10]);     // → 0
sumWithReduce([100]);         // → 100
\`\`\`

## ポイント

- \`arr.reduce((acc, n) => acc + n, 0)\` の形が定型。
- 初期値 \`0\` を **必ず指定** しましょう (空配列で例外を防ぐ)。
`,
  starterFiles: singleFile(`function sumWithReduce(arr) {
  // ここを実装してください (reduce を使う)
}
`),
  entryPoints: ["sumWithReduce"],
  demoCall: `console.log(sumWithReduce([1, 2, 3, 4]));`,
  tests: [
    { name: "sumWithReduce([1,2,3]) は 6", code: `sumWithReduce([1,2,3]) === 6` },
    { name: "sumWithReduce([]) は 0", code: `sumWithReduce([]) === 0` },
    { name: "sumWithReduce([10,-10]) は 0", code: `sumWithReduce([10,-10]) === 0` },
    { name: "sumWithReduce([100]) は 100", code: `sumWithReduce([100]) === 100` },
    { name: "sumWithReduce([1,2,3,4,5]) は 15", code: `sumWithReduce([1,2,3,4,5]) === 15` },
  ],
  hints: [
    "arr.reduce((acc, n) => acc + n, 0);",
    "解答例:\n```js\nfunction sumWithReduce(arr) {\n  return arr.reduce((acc, n) => acc + n, 0);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で合計を返す" },
        { kind: "method", name: "reduce", label: "Array.reduce を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function sumWithReduce(arr) {
  return arr.reduce((acc, n) => acc + n, 0);
}
`,
  badSolutions: [
    {
      code: `function sumWithReduce(arr) {
  let sum = 0;
  for (const n of arr) sum += n;
  return sum;
}
`,
      description: "reduce を使っていない (required 違反)",
    },
    {
      code: `function sumWithReduce(arr) {
  return arr.reduce((acc, n) => acc + n);
}
`,
      description: "初期値が無く、 空配列で TypeError",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.reduce()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce()",
    },
  ],
};
