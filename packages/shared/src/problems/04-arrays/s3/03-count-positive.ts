import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04CountPositive: Assignment = {
  id: "S3-Ch04-03-count-positive",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 3,
  title: "正の数の個数を数える",
  newConcept: "for ループ + 条件カウントの定型",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` を受け取り、 **正の数 (\`> 0\`)** の個数を返す関数 \`countPositive\` を実装してください。 \`0\` は正の数に含めません。

\`\`\`js
countPositive([1, -2, 3, -4]);   // → 2
countPositive([0, 0, 5]);        // → 1
countPositive([-1, -2, -3]);     // → 0
countPositive([]);               // → 0
\`\`\`

## ポイント

- カウンタを 0 で初期化し、 \`n > 0\` のときだけ加算します。
`,
  starterFiles: singleFile(`function countPositive(arr) {
  // ここを実装してください
}
`),
  entryPoints: ["countPositive"],
  demoCall: `console.log(countPositive([1, -2, 3, -4]));`,
  tests: [
    { name: "countPositive([1,-2,3,-4]) は 2", code: `countPositive([1,-2,3,-4]) === 2` },
    { name: "countPositive([0,0,5]) は 1", code: `countPositive([0,0,5]) === 1` },
    { name: "countPositive([-1,-2,-3]) は 0", code: `countPositive([-1,-2,-3]) === 0` },
    { name: "countPositive([]) は 0", code: `countPositive([]) === 0` },
    { name: "countPositive([1,2,3,4,5]) は 5", code: `countPositive([1,2,3,4,5]) === 5` },
  ],
  hints: [
    "if (n > 0) count++; の定型。",
    "解答例:\n```js\nfunction countPositive(arr) {\n  let count = 0;\n  for (const n of arr) {\n    if (n > 0) count++;\n  }\n  return count;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で個数を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function countPositive(arr) {
  let count = 0;
  for (const n of arr) {
    if (n > 0) {
      count++;
    }
  }
  return count;
}
`,
  badSolutions: [
    {
      code: `function countPositive(arr) {
  return arr.length;
}
`,
      description: "全要素数を返している",
    },
    {
      code: `function countPositive(arr) {
  let count = 0;
  for (const n of arr) {
    if (n >= 0) count++;
  }
  return count;
}
`,
      description: "0 を正の数に含めてしまっている",
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
