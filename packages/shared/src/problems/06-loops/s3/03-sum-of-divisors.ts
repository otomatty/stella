import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch06SumOfDivisors: Assignment = {
  id: "S3-Ch06-03-sum-of-divisors",
  stage: "S3",
  chapterId: "Ch06",
  sequence: 3,
  title: "正の整数の約数の総和を返す",
  newConcept: "for ループの中で条件を伴う累積",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

正の整数 \`n\` を受け取り、 \`n\` の **約数** (1 から n までで割り切れる数) の総和を返す関数 \`sumOfDivisors\` を実装してください。

\`\`\`js
sumOfDivisors(1);    // → 1           (1)
sumOfDivisors(6);    // → 12          (1+2+3+6)
sumOfDivisors(12);   // → 28          (1+2+3+4+6+12)
sumOfDivisors(7);    // → 8           (1+7)
\`\`\`

## ポイント

- \`i\` を 1 から \`n\` まで動かし、 \`n % i === 0\` のとき \`sum\` に足します。
- \`i * i <= n\` の最適化は S4 で扱うので、 ここでは素直に書きます。
`,
  starterFiles: singleFile(`function sumOfDivisors(n) {
  // ここを実装してください
}
`),
  entryPoints: ["sumOfDivisors"],
  demoCall: `console.log(sumOfDivisors(12));`,
  tests: [
    { name: "sumOfDivisors(1) は 1", code: `sumOfDivisors(1) === 1` },
    { name: "sumOfDivisors(6) は 12", code: `sumOfDivisors(6) === 12` },
    { name: "sumOfDivisors(12) は 28", code: `sumOfDivisors(12) === 28` },
    { name: "sumOfDivisors(7) は 8", code: `sumOfDivisors(7) === 8` },
    { name: "sumOfDivisors(28) は 56", code: `sumOfDivisors(28) === 56` },
  ],
  hints: [
    "for で i=1..n を回し、 n % i === 0 のとき sum += i。",
    "解答例:\n```js\nfunction sumOfDivisors(n) {\n  let sum = 0;\n  for (let i = 1; i <= n; i++) {\n    if (n % i === 0) sum += i;\n  }\n  return sum;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で総和を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function sumOfDivisors(n) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) {
      sum += i;
    }
  }
  return sum;
}
`,
  badSolutions: [
    {
      code: `function sumOfDivisors(n) {
  return n;
}
`,
      description: "約数の総和ではなく n そのものを返している",
    },
    {
      code: `function sumOfDivisors(n) {
  let sum = 0;
  for (let i = 2; i < n; i++) {
    if (n % i === 0) sum += i;
  }
  return sum;
}
`,
      description: "1 と n を約数に含めていない",
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
