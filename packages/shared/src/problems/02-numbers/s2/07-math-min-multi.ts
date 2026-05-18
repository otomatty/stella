import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02MathMinMulti: Assignment = {
  id: "S2-Ch02-07-math-min-multi",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 7,
  title: "Math.min で複数値の最小を求める",
  newConcept: "Math.min は引数を何個でも取れる",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`Math.min\` を使って \`5\`、 \`2\`、 \`8\`、 \`1\`、 \`9\` の中の **最小値** を出力してください。

## 期待する出力

\`\`\`
1
\`\`\`

## ポイント

- \`Math.min(5, 2, 8, 1, 9)\` のように **値を並べる** だけで最小値が得られます。
- \`Math.max\` と対になります。
`,
  starterFiles: singleFile(`// Math.min の引数に説明文の数値をカンマ区切りで並べ、 結果を const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 1 になる",
      expectedStdout: "1",
    },
  ],
  hints: [
    "`Math.min(a, b, c, ...)` のように **カンマ区切り** で値を並べます。",
    "5 個の中で一番小さいのは `1`。",
    "解答例:\n```js\nconst smallest = Math.min(5, 2, 8, 1, 9);\nconsole.log(smallest);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "min", label: "Math.min を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const smallest = Math.min(5, 2, 8, 1, 9);
console.log(smallest);
`,
  badSolutions: [
    {
      code: `console.log(1);
`,
      description: "Math.min を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Math.min()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/min", pageTitle: "Math.min()" },
  ],
};
