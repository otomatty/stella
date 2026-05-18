import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch08SumValues: Assignment = {
  id: "S3-Ch08-04-sum-values",
  stage: "S3",
  chapterId: "Ch08",
  sequence: 4,
  title: "オブジェクトの数値プロパティを全部足す",
  newConcept: "Object.values で値配列を取り出して走査する",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

すべての値が数値のオブジェクト \`scores\` を受け取り、 その合計を返す関数 \`sumValues\` を実装してください。 空オブジェクトの場合は \`0\` を返します。

\`\`\`js
sumValues({ a: 1, b: 2, c: 3 });    // → 6
sumValues({});                      // → 0
sumValues({ x: 10 });               // → 10
sumValues({ a: -1, b: 1 });         // → 0
\`\`\`

## ポイント

- \`Object.values(obj)\` で値だけの配列が取れます。
- そこから for...of で合計します。
`,
  starterFiles: singleFile(`function sumValues(scores) {
  // ここを実装してください
}
`),
  entryPoints: ["sumValues"],
  demoCall: `console.log(sumValues({ a: 1, b: 2, c: 3 }));`,
  tests: [
    { name: "sumValues({a:1,b:2,c:3}) は 6", code: `sumValues({ a: 1, b: 2, c: 3 }) === 6` },
    { name: "sumValues({}) は 0", code: `sumValues({}) === 0` },
    { name: "sumValues({x:10}) は 10", code: `sumValues({ x: 10 }) === 10` },
    { name: "sumValues({a:-1,b:1}) は 0", code: `sumValues({ a: -1, b: 1 }) === 0` },
    { name: "sumValues({a:5,b:5,c:5,d:5}) は 20", code: `sumValues({ a: 5, b: 5, c: 5, d: 5 }) === 20` },
  ],
  hints: [
    "Object.values + for...of で合計。",
    "解答例:\n```js\nfunction sumValues(scores) {\n  let sum = 0;\n  for (const v of Object.values(scores)) {\n    sum += v;\n  }\n  return sum;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で合計を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function sumValues(scores) {
  let sum = 0;
  for (const v of Object.values(scores)) {
    sum += v;
  }
  return sum;
}
`,
  badSolutions: [
    {
      code: `function sumValues(scores) {
  return Object.keys(scores).length;
}
`,
      description: "値の合計ではなくキー数を返している",
    },
    {
      code: `function sumValues(scores) {
  return 0;
}
`,
      description: "常に 0 を返している",
    },
  ],
  mdnSections: [
    {
      heading: "Object.values()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/values",
      pageTitle: "Object.values()",
    },
  ],
};
