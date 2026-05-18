import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch02Abs: Assignment = {
  id: "S3-Ch02-02-abs",
  stage: "S3",
  chapterId: "Ch02",
  sequence: 2,
  title: "Math.abs を使わずに絶対値を返す",
  newConcept: "条件演算子 (三項演算子) で値を分岐させる",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値 \`n\` を受け取り、 その絶対値を返す関数 \`abs\` を実装してください。 \`Math.abs\` は使わずに、 \`if\` 文または三項演算子 \`condition ? a : b\` で書いてください。

\`\`\`js
abs(5);    // → 5
abs(-5);   // → 5
abs(0);    // → 0
abs(-3.5); // → 3.5
\`\`\`

## ポイント

- 負の数は \`-1\` を掛ければ正の数になります。
- 三項演算子 \`n >= 0 ? n : -n\` で 1 行で書けます。
`,
  starterFiles: singleFile(`function abs(n) {
  // ここを実装してください (Math.abs は使わない)
}
`),
  entryPoints: ["abs"],
  demoCall: `console.log(abs(-5));`,
  tests: [
    { name: "abs(5) は 5", code: `abs(5) === 5` },
    { name: "abs(-5) は 5", code: `abs(-5) === 5` },
    { name: "abs(0) は 0", code: `abs(0) === 0` },
    { name: "abs(-3.5) は 3.5", code: `abs(-3.5) === 3.5` },
    { name: "abs(100) は 100", code: `abs(100) === 100` },
  ],
  hints: [
    "三項演算子 `n >= 0 ? n : -n` で書けます。",
    "if 文を使う場合は `if (n < 0) return -n;` の形が分かりやすいです。",
    "解答例:\n```js\nfunction abs(n) {\n  return n >= 0 ? n : -n;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "abs", label: "Math.abs を使わない" },
      ],
    },
  },
  solution: `function abs(n) {
  return n >= 0 ? n : -n;
}
`,
  badSolutions: [
    {
      code: `function abs(n) {
  return Math.abs(n);
}
`,
      description: "Math.abs を使ってしまっている (forbidden)",
    },
    {
      code: `function abs(n) {
  return n;
}
`,
      description: "負数を絶対値に変換していない",
    },
  ],
  mdnSections: [
    {
      heading: "条件 (三項) 演算子",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Conditional_operator",
      pageTitle: "条件 (三項) 演算子",
    },
  ],
};
