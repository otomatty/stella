import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07CallNTimes: Assignment = {
  id: "S3-Ch07-06-call-n-times",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 6,
  title: "関数を n 回呼んで結果を配列で返す",
  newConcept: "関数を引数で受け、 戻り値を集める",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

関数 \`fn\` と回数 \`n\` を受け取り、 \`fn(0)\`, \`fn(1)\`, ..., \`fn(n-1)\` を順に呼び出し、 戻り値を配列にまとめて返す関数 \`callNTimes\` を実装してください。 \`n === 0\` のときは空配列を返します。

\`\`\`js
callNTimes((i) => i * 2, 4);     // → [0, 2, 4, 6]
callNTimes((i) => "x", 3);       // → ["x", "x", "x"]
callNTimes((i) => i, 0);         // → []
callNTimes((i) => i + 10, 3);    // → [10, 11, 12]
\`\`\`

## ポイント

- \`const result = []; for (let i = 0; i < n; i++) result.push(fn(i));\` の定型。
`,
  starterFiles: singleFile(`function callNTimes(fn, n) {
  // ここを実装してください
}
`),
  entryPoints: ["callNTimes"],
  demoCall: `console.log(callNTimes((i) => i * 2, 4));`,
  tests: [
    {
      name: "callNTimes((i)=>i*2, 4) は [0,2,4,6]",
      code: `(() => { const r = callNTimes((i) => i * 2, 4); return JSON.stringify(r) === "[0,2,4,6]"; })()`,
    },
    {
      name: 'callNTimes((i)=>"x", 3) は ["x","x","x"]',
      code: `(() => { const r = callNTimes((i) => "x", 3); return JSON.stringify(r) === "[\\"x\\",\\"x\\",\\"x\\"]"; })()`,
    },
    {
      name: "callNTimes((i)=>i, 0) は []",
      code: `(() => { const r = callNTimes((i) => i, 0); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "callNTimes((i)=>i+10, 3) は [10,11,12]",
      code: `(() => { const r = callNTimes((i) => i + 10, 3); return JSON.stringify(r) === "[10,11,12]"; })()`,
    },
  ],
  hints: [
    "for で i=0..n-1、 push(fn(i))。",
    "解答例:\n```js\nfunction callNTimes(fn, n) {\n  const result = [];\n  for (let i = 0; i < n; i++) {\n    result.push(fn(i));\n  }\n  return result;\n}\n```",
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
  solution: `function callNTimes(fn, n) {
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(fn(i));
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function callNTimes(fn, n) {
  return [fn(0), fn(1), fn(2)];
}
`,
      description: "n を考慮せず常に 3 個固定",
    },
    {
      code: `function callNTimes(fn, n) {
  const result = [];
  for (let i = 1; i <= n; i++) {
    result.push(fn(i));
  }
  return result;
}
`,
      description: "i が 1 始まりで off-by-one (期待は 0 始まり)",
    },
  ],
  mdnSections: [
    {
      heading: "関数を引数として渡す",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Functions",
      pageTitle: "関数",
    },
  ],
};
