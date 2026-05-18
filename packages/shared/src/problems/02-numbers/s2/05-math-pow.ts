import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02MathPow: Assignment = {
  id: "S2-Ch02-05-math-pow",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 5,
  title: "Math.pow で累乗を計算する",
  newConcept: "Math.pow(底, 指数) で累乗を計算する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`Math.pow\` を使って \`2\` の \`10\` 乗を計算し、 結果を出力してください。

## 期待する出力

\`\`\`
1024
\`\`\`

## ポイント

- \`Math.pow(2, 10)\` は \`2 ** 10\` と同じ意味です。
- 一方を使えればもう一方も読めるようになりますが、 ライブラリ系コードでは \`Math.pow\` がよく出てきます。
`,
  starterFiles: singleFile(`// Math.pow(底, 指数) の結果を const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 1024 になる",
      expectedStdout: "1024",
    },
  ],
  hints: [
    "`Math.pow(底, 指数)` の形で呼び出します。",
    "今回は底 `2`、 指数 `10`。 結果は `1024`。",
    "解答例:\n```js\nconst result = Math.pow(2, 10);\nconsole.log(result);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "pow", label: "Math.pow を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const result = Math.pow(2, 10);
console.log(result);
`,
  badSolutions: [
    {
      code: `console.log(1024);
`,
      description: "Math.pow を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Math.pow()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/pow", pageTitle: "Math.pow()" },
  ],
};
