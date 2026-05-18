import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04MaxValue: Assignment = {
  id: "S3-Ch04-02-max-value",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 2,
  title: "配列の最大値を返す",
  newConcept: "現在の最大候補を更新しながら走査する",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` (1 要素以上) を受け取り、 その最大値を返す関数 \`maxValue\` を実装してください。 \`Math.max(...arr)\` は使わずに、 for ループで自前実装してください。

\`\`\`js
maxValue([3, 1, 4]);      // → 4
maxValue([7]);            // → 7
maxValue([-5, -2, -8]);   // → -2
maxValue([1, 1, 1]);      // → 1
\`\`\`

## ポイント

- 最初の要素を \`max\` の初期値とし、 残りを走査して更新します。
- \`if (n > max) max = n;\` の形が定石です。
`,
  starterFiles: singleFile(`function maxValue(arr) {
  // ここを実装してください (Math.max(...arr) は使わない)
}
`),
  entryPoints: ["maxValue"],
  demoCall: `console.log(maxValue([3, 1, 4]));`,
  tests: [
    { name: "maxValue([3,1,4]) は 4", code: `maxValue([3,1,4]) === 4` },
    { name: "maxValue([7]) は 7", code: `maxValue([7]) === 7` },
    { name: "maxValue([-5,-2,-8]) は -2", code: `maxValue([-5,-2,-8]) === -2` },
    { name: "maxValue([1,1,1]) は 1", code: `maxValue([1,1,1]) === 1` },
    { name: "maxValue([10,20,30,5]) は 30", code: `maxValue([10,20,30,5]) === 30` },
  ],
  hints: [
    "初期値は arr[0]、 残りで n > max なら更新。",
    "解答例:\n```js\nfunction maxValue(arr) {\n  let max = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] > max) max = arr[i];\n  }\n  return max;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で最大値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "max", label: "Math.max を使わない" },
      ],
    },
  },
  solution: `function maxValue(arr) {
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
  }
  return max;
}
`,
  badSolutions: [
    {
      code: `function maxValue(arr) {
  return Math.max(...arr);
}
`,
      description: "Math.max を使っている (forbidden)",
    },
    {
      code: `function maxValue(arr) {
  return arr[arr.length - 1];
}
`,
      description: "末尾要素を返しているだけ",
    },
  ],
  mdnSections: [
    {
      heading: "Array の走査",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array",
      pageTitle: "Array",
    },
  ],
};
