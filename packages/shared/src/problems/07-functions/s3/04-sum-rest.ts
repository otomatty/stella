import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07SumRest: Assignment = {
  id: "S3-Ch07-04-sum-rest",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 4,
  title: "任意個数の数値を残余パラメータで受け取って合計",
  newConcept: "残余パラメータ \`...nums\` で可変長引数を扱う",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

可変長の数値を受け取り、 すべての合計を返す関数 \`sumAll\` を実装してください。 残余パラメータ \`(...nums)\` で受け取ります。 引数が 0 個なら \`0\` を返します。

\`\`\`js
sumAll();              // → 0
sumAll(1);             // → 1
sumAll(1, 2, 3);       // → 6
sumAll(10, 20, 30, 40); // → 100
\`\`\`

## ポイント

- 残余パラメータは \`function f(...nums) { ... }\` のように書きます。
- \`nums\` は **配列** として受け取れるので、 for...of で合計できます。
`,
  starterFiles: singleFile(`function sumAll() {
  // 残余パラメータ ...nums で受け取って合計してください
}
`),
  entryPoints: ["sumAll"],
  demoCall: `console.log(sumAll(1, 2, 3, 4));`,
  tests: [
    { name: "sumAll() は 0", code: `sumAll() === 0` },
    { name: "sumAll(1) は 1", code: `sumAll(1) === 1` },
    { name: "sumAll(1,2,3) は 6", code: `sumAll(1,2,3) === 6` },
    { name: "sumAll(10,20,30,40) は 100", code: `sumAll(10,20,30,40) === 100` },
    { name: "sumAll(-1,1) は 0", code: `sumAll(-1, 1) === 0` },
  ],
  hints: [
    "function sumAll(...nums) { ... } で配列として受け取れる。",
    "解答例:\n```js\nfunction sumAll(...nums) {\n  let sum = 0;\n  for (const n of nums) sum += n;\n  return sum;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で合計を返す" },
        { kind: "node", nodeType: "RestElement", label: "...nums (残余パラメータ) を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function sumAll(...nums) {
  let sum = 0;
  for (const n of nums) {
    sum += n;
  }
  return sum;
}
`,
  badSolutions: [
    {
      code: `function sumAll(a, b, c) {
  return (a || 0) + (b || 0) + (c || 0);
}
`,
      description: "残余パラメータを使っておらず 3 引数までしか足せない",
    },
    {
      code: `function sumAll(...nums) {
  return nums.length;
}
`,
      description: "合計ではなく要素数を返している",
    },
  ],
  mdnSections: [
    {
      heading: "残余パラメータ",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/rest_parameters",
      pageTitle: "残余引数",
    },
  ],
};
