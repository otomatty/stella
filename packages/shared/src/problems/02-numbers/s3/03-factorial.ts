import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch02Factorial: Assignment = {
  id: "S3-Ch02-03-factorial",
  stage: "S3",
  chapterId: "Ch02",
  sequence: 3,
  title: "階乗 (n!) を計算する",
  newConcept: "ループで累積結果を組み立てる",
  estimatedMinutes: 15,
  difficulty: 2,
  testKind: "function",
  description: `## やること

非負整数 \`n\` を受け取り、 \`n!\` (n の階乗) を返す関数 \`factorial\` を実装してください。 \`0!\` は \`1\` です。

\`\`\`js
factorial(0);  // → 1
factorial(1);  // → 1
factorial(5);  // → 120
factorial(7);  // → 5040
\`\`\`

## ポイント

- \`let result = 1\` で初期化し、 \`for\` ループで \`result *= i\` を繰り返します。
- \`n === 0\` のときも結果が \`1\` になるよう、 初期値の選び方に注意します (掛け算の単位元は 1)。
`,
  starterFiles: singleFile(`function factorial(n) {
  // ここを実装してください
}
`),
  entryPoints: ["factorial"],
  demoCall: `console.log(factorial(5));`,
  tests: [
    { name: "factorial(0) は 1", code: `factorial(0) === 1` },
    { name: "factorial(1) は 1", code: `factorial(1) === 1` },
    { name: "factorial(5) は 120", code: `factorial(5) === 120` },
    { name: "factorial(7) は 5040", code: `factorial(7) === 5040` },
    { name: "factorial(10) は 3628800", code: `factorial(10) === 3628800` },
  ],
  hints: [
    "`let result = 1; for (let i = 2; i <= n; i++) result *= i;` の形が定番です。",
    "解答例:\n```js\nfunction factorial(n) {\n  let result = 1;\n  for (let i = 2; i <= n; i++) {\n    result *= i;\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function factorial(n) {
  let result = 0;
  for (let i = 1; i <= n; i++) {
    result *= i;
  }
  return result;
}
`,
      description: "初期値が 0 なので常に 0 を返してしまう",
    },
    {
      code: `function factorial(n) {
  return n;
}
`,
      description: "階乗計算をしておらず n をそのまま返している",
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
