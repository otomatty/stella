import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04ArrayAverage: Assignment = {
  id: "S3-Ch04-07-array-average",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 7,
  title: "配列の平均値を返す",
  newConcept: "合計と要素数を組み合わせて平均を出す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

非空の数値配列 \`arr\` を受け取り、 平均値を返す関数 \`arrayAverage\` を実装してください。 結果は \`Number\` 型で、 必要なら小数を含みます。

\`\`\`js
arrayAverage([1, 2, 3]);    // → 2
arrayAverage([10, 20]);     // → 15
arrayAverage([1, 2]);       // → 1.5
arrayAverage([5]);          // → 5
\`\`\`

## ポイント

- 合計 \`sum\` を計算し、 \`sum / arr.length\` を返します。
- 空配列はテストに含まれません (前提として 1 要素以上)。
`,
  starterFiles: singleFile(`function arrayAverage(arr) {
  // ここを実装してください
}
`),
  entryPoints: ["arrayAverage"],
  demoCall: `console.log(arrayAverage([1, 2, 3]));`,
  tests: [
    { name: "arrayAverage([1,2,3]) は 2", code: `arrayAverage([1,2,3]) === 2` },
    { name: "arrayAverage([10,20]) は 15", code: `arrayAverage([10,20]) === 15` },
    { name: "arrayAverage([1,2]) は 1.5", code: `arrayAverage([1,2]) === 1.5` },
    { name: "arrayAverage([5]) は 5", code: `arrayAverage([5]) === 5` },
    { name: "arrayAverage([4,4,4,4]) は 4", code: `arrayAverage([4,4,4,4]) === 4` },
  ],
  hints: [
    "for ループで合計、 最後に length で割る。",
    "解答例:\n```js\nfunction arrayAverage(arr) {\n  let sum = 0;\n  for (const n of arr) sum += n;\n  return sum / arr.length;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で平均値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function arrayAverage(arr) {
  let sum = 0;
  for (const n of arr) {
    sum += n;
  }
  return sum / arr.length;
}
`,
  badSolutions: [
    {
      code: `function arrayAverage(arr) {
  let sum = 0;
  for (const n of arr) sum += n;
  return sum;
}
`,
      description: "合計だけ返している (length で割っていない)",
    },
    {
      code: `function arrayAverage(arr) {
  return arr[0];
}
`,
      description: "先頭要素を返している",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.length",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/length",
      pageTitle: "Array.prototype.length",
    },
  ],
};
