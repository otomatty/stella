import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch05CompareCount: Assignment = {
  id: "S3-Ch05-04-compare-count",
  stage: "S3",
  chapterId: "Ch05",
  sequence: 4,
  title: "2 つの値を比較して文字列を返す",
  newConcept: "比較結果を 3 通りの文字列に分岐させる",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値 \`a\` と \`b\` を受け取り、 大小関係を以下の文字列で返す関数 \`compareCount\` を実装してください。

- \`a > b\` なら \`"a の方が大きい"\`
- \`a < b\` なら \`"b の方が大きい"\`
- それ以外 (等しい) なら \`"同じ"\`

\`\`\`js
compareCount(3, 1);   // → "a の方が大きい"
compareCount(2, 5);   // → "b の方が大きい"
compareCount(4, 4);   // → "同じ"
\`\`\`

## ポイント

- 3 つの分岐は \`if / else if / else\`、 または早期 return で書きます。
`,
  starterFiles: singleFile(`function compareCount(a, b) {
  // ここを実装してください
}
`),
  entryPoints: ["compareCount"],
  demoCall: `console.log(compareCount(3, 1));`,
  tests: [
    { name: 'compareCount(3, 1) は "a の方が大きい"', code: `compareCount(3, 1) === "a の方が大きい"` },
    { name: 'compareCount(2, 5) は "b の方が大きい"', code: `compareCount(2, 5) === "b の方が大きい"` },
    { name: 'compareCount(4, 4) は "同じ"', code: `compareCount(4, 4) === "同じ"` },
    { name: 'compareCount(-1, 0) は "b の方が大きい"', code: `compareCount(-1, 0) === "b の方が大きい"` },
    { name: 'compareCount(10, -10) は "a の方が大きい"', code: `compareCount(10, -10) === "a の方が大きい"` },
  ],
  hints: [
    "if (a > b) ... if (a < b) ... return '同じ';",
    "解答例:\n```js\nfunction compareCount(a, b) {\n  if (a > b) return \"a の方が大きい\";\n  if (a < b) return \"b の方が大きい\";\n  return \"同じ\";\n}\n```",
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
  solution: `function compareCount(a, b) {
  if (a > b) {
    return "a の方が大きい";
  }
  if (a < b) {
    return "b の方が大きい";
  }
  return "同じ";
}
`,
  badSolutions: [
    {
      code: `function compareCount(a, b) {
  if (a > b) return "a の方が大きい";
  return "b の方が大きい";
}
`,
      description: "等しい場合の判定が欠けている",
    },
    {
      code: `function compareCount(a, b) {
  return "同じ";
}
`,
      description: "常に '同じ' を返している",
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
