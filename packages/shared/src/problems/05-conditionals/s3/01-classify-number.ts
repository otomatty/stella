import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch05ClassifyNumber: Assignment = {
  id: "S3-Ch05-01-classify-number",
  stage: "S3",
  chapterId: "Ch05",
  sequence: 1,
  title: "数値を 正 / 負 / ゼロ に分類して返す",
  newConcept: "3 つ以上の分岐を if / else if / else で書く",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値 \`n\` を受け取り、 以下のいずれかを返す関数 \`classifyNumber\` を実装してください。

- \`n > 0\` なら \`"正"\`
- \`n < 0\` なら \`"負"\`
- \`n === 0\` なら \`"ゼロ"\`

\`\`\`js
classifyNumber(5);    // → "正"
classifyNumber(-3);   // → "負"
classifyNumber(0);    // → "ゼロ"
classifyNumber(0.1);  // → "正"
\`\`\`

## ポイント

- 3 分岐は \`if / else if / else\` で書きます。
- 早期 return パターンも使えます (\`if (n > 0) return "正";\`)。
`,
  starterFiles: singleFile(`function classifyNumber(n) {
  // ここを実装してください
}
`),
  entryPoints: ["classifyNumber"],
  demoCall: `console.log(classifyNumber(-3));`,
  tests: [
    { name: 'classifyNumber(5) は "正"', code: `classifyNumber(5) === "正"` },
    { name: 'classifyNumber(-3) は "負"', code: `classifyNumber(-3) === "負"` },
    { name: 'classifyNumber(0) は "ゼロ"', code: `classifyNumber(0) === "ゼロ"` },
    { name: 'classifyNumber(0.1) は "正"', code: `classifyNumber(0.1) === "正"` },
    { name: 'classifyNumber(-0.001) は "負"', code: `classifyNumber(-0.001) === "負"` },
  ],
  hints: [
    "if (n > 0) ... else if (n < 0) ... else ... の形が定型。",
    "解答例:\n```js\nfunction classifyNumber(n) {\n  if (n > 0) return \"正\";\n  if (n < 0) return \"負\";\n  return \"ゼロ\";\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で文字列を返す" },
        { kind: "node", nodeType: "IfStatement", label: "if 文で分岐する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function classifyNumber(n) {
  if (n > 0) {
    return "正";
  }
  if (n < 0) {
    return "負";
  }
  return "ゼロ";
}
`,
  badSolutions: [
    {
      code: `function classifyNumber(n) {
  return "正";
}
`,
      description: "常に '正' を返している",
    },
    {
      code: `function classifyNumber(n) {
  if (n >= 0) return "正";
  return "負";
}
`,
      description: "0 を '正' に分類してしまっている",
    },
  ],
  mdnSections: [
    {
      heading: "if...else",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/if...else",
      pageTitle: "if...else",
    },
  ],
};
