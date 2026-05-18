import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02MathSqrt: Assignment = {
  id: "S2-Ch02-06-math-sqrt",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 6,
  title: "Math.sqrt で平方根を計算する",
  newConcept: "Math.sqrt(値) で平方根を取得する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`Math.sqrt\` を使って \`144\` の平方根を出力してください。

## 期待する出力

\`\`\`
12
\`\`\`

## ポイント

- \`Math.sqrt(144)\` は \`12\` を返します (12 × 12 = 144)。
- 距離計算 (三平方の定理) などで使います。
`,
  starterFiles: singleFile(`// Math.sqrt で平方根を計算した結果を const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 12 になる",
      expectedStdout: "12",
    },
  ],
  hints: [
    "`Math.sqrt(値)` の形で呼び出します。",
    "12 × 12 = 144 なので、 144 の平方根は 12 です。",
    "解答例:\n```js\nconst result = Math.sqrt(144);\nconsole.log(result);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "sqrt", label: "Math.sqrt を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const result = Math.sqrt(144);
console.log(result);
`,
  badSolutions: [
    {
      code: `console.log(12);
`,
      description: "Math.sqrt を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Math.sqrt()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt", pageTitle: "Math.sqrt()" },
  ],
};
