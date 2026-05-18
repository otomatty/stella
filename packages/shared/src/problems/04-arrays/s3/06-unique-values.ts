import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04UniqueValues: Assignment = {
  id: "S3-Ch04-06-unique-values",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 6,
  title: "重複を取り除いて新しい配列で返す",
  newConcept: "includes で「すでに入っているか」 を確認しながら push",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

配列 \`arr\` を受け取り、 重複を取り除いた **元の順番** の新しい配列を返す関数 \`uniqueValues\` を実装してください。

\`\`\`js
uniqueValues([1, 2, 2, 3, 1]);    // → [1, 2, 3]
uniqueValues(["a", "b", "a"]);    // → ["a", "b"]
uniqueValues([]);                 // → []
uniqueValues([5]);                // → [5]
\`\`\`

## ポイント

- 結果配列 \`const result = []\` を作り、 各要素について **\`result.includes(n)\` が \`false\` なら push** する形が定番。
- \`new Set(arr)\` を使う方法もありますが、 ここでは \`includes\` の練習として手書きします。
`,
  starterFiles: singleFile(`function uniqueValues(arr) {
  // ここを実装してください
}
`),
  entryPoints: ["uniqueValues"],
  demoCall: `console.log(uniqueValues([1, 2, 2, 3, 1]));`,
  tests: [
    {
      name: "uniqueValues([1,2,2,3,1]) は [1,2,3]",
      code: `(() => { const r = uniqueValues([1,2,2,3,1]); return JSON.stringify(r) === "[1,2,3]"; })()`,
    },
    {
      name: 'uniqueValues(["a","b","a"]) は ["a","b"]',
      code: `(() => { const r = uniqueValues(["a","b","a"]); return JSON.stringify(r) === "[\\"a\\",\\"b\\"]"; })()`,
    },
    {
      name: "uniqueValues([]) は []",
      code: `(() => { const r = uniqueValues([]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "uniqueValues([5]) は [5]",
      code: `(() => { const r = uniqueValues([5]); return JSON.stringify(r) === "[5]"; })()`,
    },
    {
      name: "uniqueValues([1,1,1,1]) は [1]",
      code: `(() => { const r = uniqueValues([1,1,1,1]); return JSON.stringify(r) === "[1]"; })()`,
    },
  ],
  hints: [
    "result.includes(n) で重複チェック。",
    "解答例:\n```js\nfunction uniqueValues(arr) {\n  const result = [];\n  for (const n of arr) {\n    if (!result.includes(n)) result.push(n);\n  }\n  return result;\n}\n```",
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
  solution: `function uniqueValues(arr) {
  const result = [];
  for (const n of arr) {
    if (!result.includes(n)) {
      result.push(n);
    }
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function uniqueValues(arr) {
  return arr;
}
`,
      description: "そのまま返している",
    },
    {
      code: `function uniqueValues(arr) {
  return arr.reverse();
}
`,
      description: "重複を取り除かず順序を反転しているだけ",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.includes()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/includes",
      pageTitle: "Array.prototype.includes()",
    },
  ],
};
