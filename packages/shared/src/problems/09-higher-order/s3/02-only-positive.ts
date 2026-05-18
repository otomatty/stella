import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09OnlyPositive: Assignment = {
  id: "S3-Ch09-02-only-positive",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 2,
  title: "正の数だけ取り出す (filter)",
  newConcept: "Array.prototype.filter で条件を満たす要素だけ抽出",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` を受け取り、 \`0\` より大きい要素だけを取り出した新しい配列を返す関数 \`onlyPositive\` を実装してください。 \`filter\` を使ってください。

\`\`\`js
onlyPositive([1, -2, 3, -4]);   // → [1, 3]
onlyPositive([0, 0, 0]);        // → []
onlyPositive([]);               // → []
onlyPositive([5, 10, 15]);      // → [5, 10, 15]
\`\`\`

## ポイント

- \`arr.filter((n) => n > 0)\`。
`,
  starterFiles: singleFile(`function onlyPositive(arr) {
  // ここを実装してください (filter を使う)
}
`),
  entryPoints: ["onlyPositive"],
  demoCall: `console.log(onlyPositive([1, -2, 3, -4]));`,
  tests: [
    {
      name: "onlyPositive([1,-2,3,-4]) は [1,3]",
      code: `JSON.stringify(onlyPositive([1,-2,3,-4])) === "[1,3]"`,
    },
    {
      name: "onlyPositive([0,0,0]) は []",
      code: `(() => { const r = onlyPositive([0,0,0]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "onlyPositive([]) は []",
      code: `(() => { const r = onlyPositive([]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "onlyPositive([5,10,15]) は [5,10,15]",
      code: `JSON.stringify(onlyPositive([5,10,15])) === "[5,10,15]"`,
    },
  ],
  hints: [
    "arr.filter((n) => n > 0);",
    "解答例:\n```js\nfunction onlyPositive(arr) {\n  return arr.filter((n) => n > 0);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "method", name: "filter", label: "Array.filter を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function onlyPositive(arr) {
  return arr.filter((n) => n > 0);
}
`,
  badSolutions: [
    {
      code: `function onlyPositive(arr) {
  return arr;
}
`,
      description: "filter していない",
    },
    {
      code: `function onlyPositive(arr) {
  return arr.filter((n) => n >= 0);
}
`,
      description: "0 を含めてしまっている",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.filter()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/filter",
      pageTitle: "Array.prototype.filter()",
    },
  ],
};
