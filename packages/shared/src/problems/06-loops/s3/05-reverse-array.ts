import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch06ReverseArray: Assignment = {
  id: "S3-Ch06-05-reverse-array",
  stage: "S3",
  chapterId: "Ch06",
  sequence: 5,
  title: "for ループだけで配列を反転して返す",
  newConcept: "末尾から走査する for ループ",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

配列 \`arr\` を受け取り、 要素順を反転した **新しい配列** を返す関数 \`reverseArray\` を実装してください。 元の配列は変更しません。 \`Array.prototype.reverse\` は使わず、 for ループで実装してください。

\`\`\`js
reverseArray([1, 2, 3]);   // → [3, 2, 1]
reverseArray(["a", "b"]);  // → ["b", "a"]
reverseArray([]);          // → []
reverseArray([42]);        // → [42]
\`\`\`

## ポイント

- 末尾から先頭まで添字を回して \`result.push(arr[i])\` するのが定石。
`,
  starterFiles: singleFile(`function reverseArray(arr) {
  // ここを実装してください (reverse は使わない)
}
`),
  entryPoints: ["reverseArray"],
  demoCall: `console.log(reverseArray([1, 2, 3]));`,
  tests: [
    {
      name: "reverseArray([1,2,3]) は [3,2,1]",
      code: `(() => { const r = reverseArray([1,2,3]); return JSON.stringify(r) === "[3,2,1]"; })()`,
    },
    {
      name: 'reverseArray(["a","b"]) は ["b","a"]',
      code: `(() => { const r = reverseArray(["a","b"]); return JSON.stringify(r) === "[\\"b\\",\\"a\\"]"; })()`,
    },
    {
      name: "reverseArray([]) は []",
      code: `(() => { const r = reverseArray([]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "reverseArray([42]) は [42]",
      code: `(() => { const r = reverseArray([42]); return JSON.stringify(r) === "[42]"; })()`,
    },
    {
      name: "元配列は変更されない",
      code: `(() => { const src = [1,2,3]; reverseArray(src); return JSON.stringify(src) === "[1,2,3]"; })()`,
    },
  ],
  hints: [
    "for (let i = arr.length - 1; i >= 0; i--) result.push(arr[i])。",
    "解答例:\n```js\nfunction reverseArray(arr) {\n  const result = [];\n  for (let i = arr.length - 1; i >= 0; i--) {\n    result.push(arr[i]);\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reverse", label: "Array.reverse を使わない" },
      ],
    },
  },
  solution: `function reverseArray(arr) {
  const result = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    result.push(arr[i]);
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function reverseArray(arr) {
  return arr.reverse();
}
`,
      description: "reverse を使っている (forbidden) かつ元配列を破壊する",
    },
    {
      code: `function reverseArray(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(arr[i]);
  }
  return result;
}
`,
      description: "反転していない (コピーしているだけ)",
    },
  ],
  mdnSections: [
    {
      heading: "for 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for",
      pageTitle: "for",
    },
  ],
};
