import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04FindFirstIndex: Assignment = {
  id: "S3-Ch04-08-find-first-index",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 8,
  title: "値の最初の出現位置を返す (なければ -1)",
  newConcept: "見つけた瞬間に return で抜ける",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

配列 \`arr\` と探す値 \`target\` を受け取り、 \`target\` が最初に現れる **添字 (0 始まり)** を返す関数 \`findFirstIndex\` を実装してください。 見つからなければ \`-1\` を返します。 \`Array.prototype.indexOf\` は使わずに for ループで実装してください。

\`\`\`js
findFirstIndex([10, 20, 30], 20);   // → 1
findFirstIndex([10, 20, 30], 99);   // → -1
findFirstIndex([], 5);              // → -1
findFirstIndex(["a","b","c"], "b"); // → 1
findFirstIndex([1, 2, 1, 2], 2);    // → 1   (最初の 2)
\`\`\`

## ポイント

- for で添字を回し、 \`arr[i] === target\` で見つけたら **その時点で \`return i\`**。
- ループを抜けるまで見つからなければ \`return -1\`。
`,
  starterFiles: singleFile(`function findFirstIndex(arr, target) {
  // ここを実装してください (indexOf は使わない)
}
`),
  entryPoints: ["findFirstIndex"],
  demoCall: `console.log(findFirstIndex([10, 20, 30], 20));`,
  tests: [
    { name: "findFirstIndex([10,20,30], 20) は 1", code: `findFirstIndex([10,20,30], 20) === 1` },
    { name: "findFirstIndex([10,20,30], 99) は -1", code: `findFirstIndex([10,20,30], 99) === -1` },
    { name: "findFirstIndex([], 5) は -1", code: `findFirstIndex([], 5) === -1` },
    { name: 'findFirstIndex(["a","b","c"], "b") は 1', code: `findFirstIndex(["a","b","c"], "b") === 1` },
    { name: "findFirstIndex([1,2,1,2], 2) は 1", code: `findFirstIndex([1,2,1,2], 2) === 1` },
  ],
  hints: [
    "見つけたらすぐ return i。 見つからなければループ後に return -1。",
    "解答例:\n```js\nfunction findFirstIndex(arr, target) {\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === target) return i;\n  }\n  return -1;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で添字を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for ループで探索する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "indexOf", label: "indexOf を使わない" },
        { kind: "method", name: "findIndex", label: "findIndex を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function findFirstIndex(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i;
    }
  }
  return -1;
}
`,
  badSolutions: [
    {
      code: `function findFirstIndex(arr, target) {
  return arr.indexOf(target);
}
`,
      description: "indexOf を使っている (forbidden)",
    },
    {
      code: `function findFirstIndex(arr, target) {
  let result = -1;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) result = i;
  }
  return result;
}
`,
      description: "最初ではなく最後の出現位置を返してしまう",
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
