import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch02SumToN: Assignment = {
  id: "S3-Ch02-05-sum-to-n",
  stage: "S3",
  chapterId: "Ch02",
  sequence: 5,
  title: "1 から n までの合計を計算する",
  newConcept: "ループで累積和を作る",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

非負整数 \`n\` を受け取り、 \`1 + 2 + ... + n\` の合計を返す関数 \`sumToN\` を実装してください。 \`n === 0\` のときは \`0\` を返します。

\`\`\`js
sumToN(0);   // → 0
sumToN(1);   // → 1
sumToN(5);   // → 15   (1+2+3+4+5)
sumToN(10);  // → 55
\`\`\`

## ポイント

- \`let sum = 0\` で初期化し、 \`for\` で \`1\` から \`n\` まで足します。
- 公式 \`n * (n + 1) / 2\` を使っても構いません。
`,
  starterFiles: singleFile(`function sumToN(n) {
  // ここを実装してください
}
`),
  entryPoints: ["sumToN"],
  demoCall: `console.log(sumToN(5));`,
  tests: [
    { name: "sumToN(0) は 0", code: `sumToN(0) === 0` },
    { name: "sumToN(1) は 1", code: `sumToN(1) === 1` },
    { name: "sumToN(5) は 15", code: `sumToN(5) === 15` },
    { name: "sumToN(10) は 55", code: `sumToN(10) === 55` },
    { name: "sumToN(100) は 5050", code: `sumToN(100) === 5050` },
  ],
  hints: [
    "for ループで `sum += i` を繰り返す。",
    "公式 `n * (n + 1) / 2` の方が高速。",
    "解答例:\n```js\nfunction sumToN(n) {\n  let sum = 0;\n  for (let i = 1; i <= n; i++) {\n    sum += i;\n  }\n  return sum;\n}\n```",
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
  solution: `function sumToN(n) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}
`,
  badSolutions: [
    {
      code: `function sumToN(n) {
  return n;
}
`,
      description: "合計を計算していない",
    },
    {
      code: `function sumToN(n) {
  let sum = 0;
  for (let i = 1; i < n; i++) {
    sum += i;
  }
  return sum;
}
`,
      description: "i < n で n 自身を足し損ねている (off-by-one)",
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
