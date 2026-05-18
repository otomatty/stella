import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch09CountTrue: Assignment = {
  id: "S3-Ch09-06-count-true",
  stage: "S3",
  chapterId: "Ch09",
  sequence: 6,
  title: "真偽値配列で true の数を数える (reduce)",
  newConcept: "reduce で集計値を作る",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

真偽値配列 \`bools\` を受け取り、 \`true\` の個数を返す関数 \`countTrue\` を実装してください。 \`reduce\` を使ってください。

\`\`\`js
countTrue([true, false, true]);        // → 2
countTrue([false, false]);             // → 0
countTrue([]);                         // → 0
countTrue([true, true, true]);         // → 3
\`\`\`

## ポイント

- \`bools.reduce((count, b) => b ? count + 1 : count, 0)\` で書ける。
- \`count + (b ? 1 : 0)\` の方が分かりやすい場合も。
`,
  starterFiles: singleFile(`function countTrue(bools) {
  // ここを実装してください (reduce を使う)
}
`),
  entryPoints: ["countTrue"],
  demoCall: `console.log(countTrue([true, false, true]));`,
  tests: [
    { name: "countTrue([true,false,true]) は 2", code: `countTrue([true, false, true]) === 2` },
    { name: "countTrue([false,false]) は 0", code: `countTrue([false, false]) === 0` },
    { name: "countTrue([]) は 0", code: `countTrue([]) === 0` },
    { name: "countTrue([true,true,true]) は 3", code: `countTrue([true, true, true]) === 3` },
    { name: "countTrue([false,true,false,true,false]) は 2", code: `countTrue([false, true, false, true, false]) === 2` },
  ],
  hints: [
    "reduce で true のとき +1。",
    "解答例:\n```js\nfunction countTrue(bools) {\n  return bools.reduce((c, b) => c + (b ? 1 : 0), 0);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で個数を返す" },
        { kind: "method", name: "reduce", label: "Array.reduce を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function countTrue(bools) {
  return bools.reduce((c, b) => c + (b ? 1 : 0), 0);
}
`,
  badSolutions: [
    {
      code: `function countTrue(bools) {
  let count = 0;
  for (const b of bools) if (b) count++;
  return count;
}
`,
      description: "reduce を使っていない",
    },
    {
      code: `function countTrue(bools) {
  return bools.length;
}
`,
      description: "true / false に関係なく全体の長さを返している",
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
