import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04FilterEven: Assignment = {
  id: "S3-Ch04-04-filter-even",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 4,
  title: "偶数だけ取り出して新しい配列で返す",
  newConcept: "新規配列を push で組み立てる",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` を受け取り、 偶数だけを順番を保って取り出した **新しい配列** を返す関数 \`filterEven\` を実装してください。 元の配列は変更しません。

\`\`\`js
filterEven([1, 2, 3, 4]);     // → [2, 4]
filterEven([1, 3, 5]);        // → []
filterEven([]);               // → []
filterEven([0, 2, 4]);        // → [0, 2, 4]   (0 も偶数)
\`\`\`

## ポイント

- 空配列 \`const result = []\` を作り、 偶数のときだけ \`push\` します。
- 配列 \`filter\` メソッドは Ch09 で導入するので、 ここでは for ループで書きます。
`,
  starterFiles: singleFile(`function filterEven(arr) {
  // ここを実装してください
}
`),
  entryPoints: ["filterEven"],
  demoCall: `console.log(filterEven([1, 2, 3, 4, 5, 6]));`,
  tests: [
    {
      name: "filterEven([1,2,3,4]) は [2,4]",
      code: `(() => { const r = filterEven([1,2,3,4]); return JSON.stringify(r) === "[2,4]"; })()`,
    },
    {
      name: "filterEven([1,3,5]) は []",
      code: `(() => { const r = filterEven([1,3,5]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "filterEven([]) は []",
      code: `(() => { const r = filterEven([]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "filterEven([0,2,4]) は [0,2,4]",
      code: `(() => { const r = filterEven([0,2,4]); return JSON.stringify(r) === "[0,2,4]"; })()`,
    },
    {
      name: "filterEven([10,11,12,13,14]) は [10,12,14]",
      code: `(() => { const r = filterEven([10,11,12,13,14]); return JSON.stringify(r) === "[10,12,14]"; })()`,
    },
    {
      name: "元の配列は変更されず、 新しい配列を返す",
      code: `(() => {
        const src = [3, 2, 1, 4];
        const before = JSON.stringify(src);
        const r = filterEven(src);
        return JSON.stringify(src) === before && r !== src;
      })()`,
    },
  ],
  hints: [
    "result = []; if (n % 2 === 0) result.push(n);",
    "解答例:\n```js\nfunction filterEven(arr) {\n  const result = [];\n  for (const n of arr) {\n    if (n % 2 === 0) result.push(n);\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "filter", label: "S3 では filter を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function filterEven(arr) {
  const result = [];
  for (const n of arr) {
    if (n % 2 === 0) {
      result.push(n);
    }
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function filterEven(arr) {
  return arr.filter((n) => n % 2 === 0);
}
`,
      description: "filter を使っている (forbidden)",
    },
    {
      code: `function filterEven(arr) {
  return arr;
}
`,
      description: "そのまま返している",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.push()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/push",
      pageTitle: "Array.prototype.push()",
    },
  ],
};
