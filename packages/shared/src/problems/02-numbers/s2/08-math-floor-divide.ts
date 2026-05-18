import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02MathFloorDivide: Assignment = {
  id: "S2-Ch02-08-math-floor-divide",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 8,
  title: "Math.floor で整数の商を求める",
  newConcept: "Math.floor と除算を組み合わせて整数の商を取る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`17\` を \`5\` で割った **整数の商** を出力してください (= 3 あまり 2 の「3」 の部分)。

\`Math.floor(17 / 5)\` を使います。

## 期待する出力

\`\`\`
3
\`\`\`

## ポイント

- \`17 / 5\` は \`3.4\`。 \`Math.floor(3.4)\` は \`3\`。
- 「人数を 5 人ずつ何チームに分けられるか」 のような **整数の割り算** で使います。
`,
  starterFiles: singleFile(`// 説明文の割り算を Math.floor で切り捨てた結果を、 const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 3 になる",
      expectedStdout: "3",
    },
  ],
  hints: [
    "まず `17 / 5` で `3.4`、 それを `Math.floor` で切り捨てます。",
    "`Math.floor(17 / 5)` でひとつの式にできます。",
    "解答例:\n```js\nconst quotient = Math.floor(17 / 5);\nconsole.log(quotient);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "floor", label: "Math.floor を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const quotient = Math.floor(17 / 5);
console.log(quotient);
`,
  badSolutions: [
    {
      code: `console.log(3);
`,
      description: "Math.floor を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Math.floor()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/floor", pageTitle: "Math.floor()" },
  ],
};
