import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch05CategorizeAge: Assignment = {
  id: "S3-Ch05-03-categorize-age",
  stage: "S3",
  chapterId: "Ch05",
  sequence: 3,
  title: "年齢から世代カテゴリを返す",
  newConcept: "範囲の連続判定 (else if の連鎖)",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

年齢 \`age\` (0 以上の整数) を受け取り、 以下の文字列を返す関数 \`categorizeAge\` を実装してください。

- 0-17: \`"未成年"\`
- 18-64: \`"成人"\`
- 65 以上: \`"シニア"\`

\`\`\`js
categorizeAge(0);    // → "未成年"
categorizeAge(17);   // → "未成年"
categorizeAge(18);   // → "成人"
categorizeAge(64);   // → "成人"
categorizeAge(65);   // → "シニア"
categorizeAge(100);  // → "シニア"
\`\`\`

## ポイント

- 早期 return を使うと境界の判定が読みやすくなります。
- \`if (age < 18) return "未成年";\` の形が定石。
`,
  starterFiles: singleFile(`function categorizeAge(age) {
  // ここを実装してください
}
`),
  entryPoints: ["categorizeAge"],
  demoCall: `console.log(categorizeAge(25));`,
  tests: [
    { name: 'categorizeAge(0) は "未成年"', code: `categorizeAge(0) === "未成年"` },
    { name: 'categorizeAge(17) は "未成年"', code: `categorizeAge(17) === "未成年"` },
    { name: 'categorizeAge(18) は "成人"', code: `categorizeAge(18) === "成人"` },
    { name: 'categorizeAge(64) は "成人"', code: `categorizeAge(64) === "成人"` },
    { name: 'categorizeAge(65) は "シニア"', code: `categorizeAge(65) === "シニア"` },
    { name: 'categorizeAge(100) は "シニア"', code: `categorizeAge(100) === "シニア"` },
  ],
  hints: [
    "境界を意識: 18 ちょうどは成人、 65 ちょうどはシニア。",
    "解答例:\n```js\nfunction categorizeAge(age) {\n  if (age < 18) return \"未成年\";\n  if (age < 65) return \"成人\";\n  return \"シニア\";\n}\n```",
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
  solution: `function categorizeAge(age) {
  if (age < 18) {
    return "未成年";
  }
  if (age < 65) {
    return "成人";
  }
  return "シニア";
}
`,
  badSolutions: [
    {
      code: `function categorizeAge(age) {
  if (age <= 18) return "未成年";
  if (age <= 65) return "成人";
  return "シニア";
}
`,
      description: "境界がずれていて 18 が未成年、 65 が成人になる",
    },
    {
      code: `function categorizeAge(age) {
  return "成人";
}
`,
      description: "常に '成人' を返している",
    },
  ],
  mdnSections: [
    {
      heading: "比較演算子",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators",
      pageTitle: "演算子",
    },
  ],
};
