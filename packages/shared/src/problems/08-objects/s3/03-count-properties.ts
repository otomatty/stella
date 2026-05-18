import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch08CountProperties: Assignment = {
  id: "S3-Ch08-03-count-properties",
  stage: "S3",
  chapterId: "Ch08",
  sequence: 3,
  title: "オブジェクトのプロパティ数を返す",
  newConcept: "Object.keys(obj).length でキー数を数える",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

オブジェクト \`obj\` を受け取り、 そのプロパティの個数を返す関数 \`countProperties\` を実装してください。

\`\`\`js
countProperties({ a: 1, b: 2 });    // → 2
countProperties({});                // → 0
countProperties({ x: 1 });          // → 1
countProperties({ a: 1, b: 2, c: 3 }); // → 3
\`\`\`

## ポイント

- \`Object.keys(obj)\` でキーの配列が取れます。 その \`.length\` がプロパティ数。
`,
  starterFiles: singleFile(`function countProperties(obj) {
  // ここを実装してください
}
`),
  entryPoints: ["countProperties"],
  demoCall: `console.log(countProperties({ a: 1, b: 2, c: 3 }));`,
  tests: [
    { name: "countProperties({a:1,b:2}) は 2", code: `countProperties({ a: 1, b: 2 }) === 2` },
    { name: "countProperties({}) は 0", code: `countProperties({}) === 0` },
    { name: "countProperties({x:1}) は 1", code: `countProperties({ x: 1 }) === 1` },
    { name: "countProperties({a:1,b:2,c:3}) は 3", code: `countProperties({ a: 1, b: 2, c: 3 }) === 3` },
  ],
  hints: [
    "Object.keys(obj).length。",
    "解答例:\n```js\nfunction countProperties(obj) {\n  return Object.keys(obj).length;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で個数を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function countProperties(obj) {
  return Object.keys(obj).length;
}
`,
  badSolutions: [
    {
      code: `function countProperties(obj) {
  return obj.length;
}
`,
      description: "オブジェクトには length プロパティがなく undefined になる",
    },
    {
      code: `function countProperties(obj) {
  return Object.values(obj);
}
`,
      description: "個数ではなく values 配列を返している",
    },
  ],
  mdnSections: [
    {
      heading: "Object.keys()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/keys",
      pageTitle: "Object.keys()",
    },
  ],
};
