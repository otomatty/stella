import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07Clamp: Assignment = {
  id: "S3-Ch07-05-clamp",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 5,
  title: "値を min と max の範囲にクランプする",
  newConcept: "3 引数の関数で値を整える",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  description: `## やること

値 \`n\`、 最小値 \`min\`、 最大値 \`max\` を受け取り、 \`n\` を \`[min, max]\` の範囲に収めて返す関数 \`clamp\` を実装してください。

- \`n < min\` なら \`min\` を返す
- \`n > max\` なら \`max\` を返す
- それ以外は \`n\` をそのまま返す

\`\`\`js
clamp(5, 0, 10);    // → 5
clamp(-3, 0, 10);   // → 0
clamp(15, 0, 10);   // → 10
clamp(0, 0, 10);    // → 0
clamp(10, 0, 10);   // → 10
\`\`\`

## ポイント

- if 文の連続でも、 \`Math.max(min, Math.min(n, max))\` のテクニックでも書けます。
`,
  starterFiles: singleFile(`function clamp(n, min, max) {
  // ここを実装してください
}
`),
  entryPoints: ["clamp"],
  demoCall: `console.log(clamp(15, 0, 10));`,
  tests: [
    { name: "clamp(5,0,10) は 5", code: `clamp(5,0,10) === 5` },
    { name: "clamp(-3,0,10) は 0", code: `clamp(-3,0,10) === 0` },
    { name: "clamp(15,0,10) は 10", code: `clamp(15,0,10) === 10` },
    { name: "clamp(0,0,10) は 0", code: `clamp(0,0,10) === 0` },
    { name: "clamp(10,0,10) は 10", code: `clamp(10,0,10) === 10` },
    { name: "clamp(-100,-50,50) は -50", code: `clamp(-100,-50,50) === -50` },
  ],
  hints: [
    "if (n < min) return min; if (n > max) return max; return n;",
    "解答例:\n```js\nfunction clamp(n, min, max) {\n  if (n < min) return min;\n  if (n > max) return max;\n  return n;\n}\n```",
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
  solution: `function clamp(n, min, max) {
  if (n < min) {
    return min;
  }
  if (n > max) {
    return max;
  }
  return n;
}
`,
  badSolutions: [
    {
      code: `function clamp(n, min, max) {
  return n;
}
`,
      description: "クランプしていない",
    },
    {
      code: `function clamp(n, min, max) {
  if (n < min) return min;
  return n;
}
`,
      description: "max 側のクランプが抜けている",
    },
  ],
  mdnSections: [
    {
      heading: "Math.min()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/min",
      pageTitle: "Math.min()",
    },
  ],
};
