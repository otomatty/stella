import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch01SwapPair: Assignment = {
  id: "S3-Ch01-05-swap-pair",
  stage: "S3",
  chapterId: "Ch01",
  sequence: 5,
  title: "2 つの値を入れ替えて配列で返す",
  newConcept: "引数の順序を組み替えて新しい値として返す",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

2 つの値 \`a\`, \`b\` を受け取り、 順番を入れ替えた配列 \`[b, a]\` を返す関数 \`swapPair\` を実装してください。

\`\`\`js
swapPair(1, 2);         // → [2, 1]
swapPair("x", "y");     // → ["y", "x"]
swapPair(true, false);  // → [false, true]
\`\`\`

## ポイント

- 配列リテラル \`[b, a]\` で要素の順番を直接書けば一発です。
- テストは \`Array.isArray\` と要素の === で確認します。
`,
  starterFiles: singleFile(`function swapPair(a, b) {
  // ここを実装してください
}
`),
  entryPoints: ["swapPair"],
  demoCall: `console.log(swapPair(1, 2));`,
  tests: [
    {
      name: "swapPair(1, 2) は [2, 1]",
      code: `(() => { const r = swapPair(1, 2); return Array.isArray(r) && r.length === 2 && r[0] === 2 && r[1] === 1; })()`,
    },
    {
      name: 'swapPair("x", "y") は ["y", "x"]',
      code: `(() => { const r = swapPair("x", "y"); return Array.isArray(r) && r.length === 2 && r[0] === "y" && r[1] === "x"; })()`,
    },
    {
      name: "swapPair(true, false) は [false, true]",
      code: `(() => { const r = swapPair(true, false); return Array.isArray(r) && r.length === 2 && r[0] === false && r[1] === true; })()`,
    },
  ],
  hints: [
    "`return [b, a];` のように配列リテラルで返せば 1 行です。",
    "解答例:\n```js\nfunction swapPair(a, b) {\n  return [b, a];\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function swapPair(a, b) {
  return [b, a];
}
`,
  badSolutions: [
    {
      code: `function swapPair(a, b) {
  return [a, b];
}
`,
      description: "順番を入れ替えていない",
    },
    {
      code: `function swapPair(a, b) {
  return b;
}
`,
      description: "配列ではなく単一の値を返している",
    },
  ],
  mdnSections: [
    {
      heading: "配列リテラル",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array",
      pageTitle: "Array",
    },
  ],
};
