import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch06CountdownString: Assignment = {
  id: "S3-Ch06-01-countdown-string",
  stage: "S3",
  chapterId: "Ch06",
  sequence: 1,
  title: "n から 0 までのカウントダウン文字列",
  newConcept: "ループで文字列を組み立てて return する",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

非負整数 \`n\` を受け取り、 \`n\` から \`0\` までを \`","\` (カンマ) で繋いだ文字列を返す関数 \`countdownString\` を実装してください。

\`\`\`js
countdownString(3);  // → "3,2,1,0"
countdownString(0);  // → "0"
countdownString(5);  // → "5,4,3,2,1,0"
\`\`\`

## ポイント

- \`for (let i = n; i >= 0; i--)\` のカウントダウンループ。
- 結果を **配列に push してから join(",")** する方が、 区切り文字の処理を考えずに済みます。
`,
  starterFiles: singleFile(`function countdownString(n) {
  // ここを実装してください
}
`),
  entryPoints: ["countdownString"],
  demoCall: `console.log(countdownString(5));`,
  tests: [
    { name: 'countdownString(3) は "3,2,1,0"', code: `countdownString(3) === "3,2,1,0"` },
    { name: 'countdownString(0) は "0"', code: `countdownString(0) === "0"` },
    { name: 'countdownString(5) は "5,4,3,2,1,0"', code: `countdownString(5) === "5,4,3,2,1,0"` },
    { name: 'countdownString(1) は "1,0"', code: `countdownString(1) === "1,0"` },
  ],
  hints: [
    "配列に push してから join(\",\")。",
    "解答例:\n```js\nfunction countdownString(n) {\n  const parts = [];\n  for (let i = n; i >= 0; i--) {\n    parts.push(String(i));\n  }\n  return parts.join(\",\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で文字列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function countdownString(n) {
  const parts = [];
  for (let i = n; i >= 0; i--) {
    parts.push(String(i));
  }
  return parts.join(",");
}
`,
  badSolutions: [
    {
      code: `function countdownString(n) {
  return String(n);
}
`,
      description: "ループしておらず単発の数値文字列を返している",
    },
    {
      code: `function countdownString(n) {
  const parts = [];
  for (let i = n; i > 0; i--) {
    parts.push(String(i));
  }
  return parts.join(",");
}
`,
      description: "0 まで含めていない (off-by-one)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.join()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/join",
      pageTitle: "Array.prototype.join()",
    },
  ],
};
